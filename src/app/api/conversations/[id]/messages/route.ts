import { createClient as createServiceClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStreamingState(part: Record<string, unknown>): boolean {
  const state = part.state;
  return typeof state === "string" && state.includes("stream");
}

function sanitizeMessageParts(parts: unknown): unknown[] | null {
  if (!Array.isArray(parts)) return null;

  const filtered = parts.filter((part) => {
    if (!isRecord(part)) return false;
    if (part.type === "step-start") return false;
    if (isStreamingState(part)) return false;

    if (part.type === "text") {
      const text = part.text;
      return typeof text === "string" && text.trim().length > 0;
    }

    return true;
  });

  return filtered.length > 0 ? filtered : null;
}

function extractTextFromParts(parts: unknown[] | null): string {
  if (!parts) return "";

  return parts
    .map((part) => {
      if (!isRecord(part)) return "";
      if (part.type !== "text") return "";
      return typeof part.text === "string" ? part.text : "";
    })
    .filter((text) => text.trim().length > 0)
    .join("\n")
    .trim();
}

function buildConversationSummary(content: string | null): string | null {
  if (!content) return null;

  const plainText = content
    .replaceAll(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replaceAll(/`([^`]+)`/g, "$1")
    .replaceAll(/\*\*([^*]+)\*\*/g, "$1")
    .replaceAll(/\s+/g, " ")
    .trim();

  if (!plainText) return null;
  if (plainText.length <= 180) return plainText;

  const slice = plainText.slice(0, 180);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = (lastSpace > 120 ? slice.slice(0, lastSpace) : slice).trim();
  return `${trimmed}…`;
}

type LooseQueryResult<T = unknown> = Promise<{ data: T; error: unknown }>;
type LooseQueryPayload = { data: unknown; error: unknown };

type LooseQueryBuilder = PromiseLike<LooseQueryPayload> & {
  update(values: Record<string, unknown>): LooseQueryBuilder;
  insert(
    values: Record<string, unknown> | Record<string, unknown>[],
  ): LooseQueryBuilder;
  select(columns?: string): LooseQueryBuilder;
  eq(column: string, value: unknown): LooseQueryBuilder;
  is(column: string, value: unknown): LooseQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): LooseQueryBuilder;
  maybeSingle(): LooseQueryResult<unknown>;
  single(): LooseQueryResult<unknown>;
};

type LooseSupabaseClient = {
  from(table: string): LooseQueryBuilder;
};

function asLooseSupabaseClient(client: unknown): LooseSupabaseClient {
  return client as LooseSupabaseClient;
}

function createServiceRoleClientOrThrow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role environment variables");
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

async function claimConversationForUser(
  conversationId: string,
  clientId: string,
  userId: string,
) {
  const serviceClient = createServiceRoleClientOrThrow();
  const serviceClientAny = asLooseSupabaseClient(serviceClient);

  const { error } = await serviceClientAny
    .from("ai_conversations")
    .update({ user_id: userId })
    .eq("id", conversationId)
    .eq("client_id", clientId)
    .is("user_id", null);

  if (error) throw error;
}

async function resolveAuthorizedSupabase(
  req: NextRequest,
  conversationId: string,
  userClient: Awaited<ReturnType<typeof createClient>>,
  userId: string | null,
) {
  const userClientAny = asLooseSupabaseClient(userClient);

  if (userId) {
    const { data: userConversation, error: userError } = await userClientAny
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (userError) throw userError;
    if (userConversation) return userClient;
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return null;

  const serviceClient = createServiceRoleClientOrThrow();
  const serviceClientAny = asLooseSupabaseClient(serviceClient);
  const { data: anonymousConversation, error: anonymousError } =
    await serviceClientAny
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("client_id", clientId)
      .is("user_id", null)
      .maybeSingle();

  if (anonymousError) throw anonymousError;
  if (!anonymousConversation) return null;

  if (userId) {
    await claimConversationForUser(conversationId, clientId, userId);

    const { data: claimedConversation, error: claimedError } =
      await userClientAny
        .from("ai_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();

    if (claimedError) throw claimedError;
    if (claimedConversation) return userClient;
  }

  return serviceClient;
}

// POST /api/conversations/[id]/messages - Save message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params;
    const { message } = await req.json();

    // Check if user is authenticated
    const userClient = await createClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();

    const supabase = await resolveAuthorizedSupabase(
      req,
      conversationId,
      userClient,
      user?.id ?? null,
    );

    if (!supabase) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const supabaseAny = asLooseSupabaseClient(supabase);

    const sanitizedParts = sanitizeMessageParts(message.parts);
    const contentFromMessage =
      typeof message.content === "string" ? message.content.trim() : "";
    const contentFromParts = extractTextFromParts(sanitizedParts);
    const content = contentFromMessage || contentFromParts || null;

    const { data, error } = await supabaseAny
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content,
        parts: sanitizedParts,
        metadata: message.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    // Update metadata for conversation list (recency + assistant summary preview).
    const conversationUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    const shouldUpdateSummary = message.role === "assistant";
    if (shouldUpdateSummary) {
      const summary = buildConversationSummary(content);
      if (summary) {
        conversationUpdate.summary = summary;
      }
    }

    await supabaseAny
      .from("ai_conversations")
      .update(conversationUpdate)
      .eq("id", conversationId);

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error("Save message error:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 },
    );
  }
}
