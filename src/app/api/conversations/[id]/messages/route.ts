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

function createServiceRoleClientOrThrow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role environment variables");
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

async function resolveAuthorizedSupabase(
  req: NextRequest,
  conversationId: string,
  userClient: Awaited<ReturnType<typeof createClient>>,
  userId: string | null,
) {
  const userClientAny = userClient as any;

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
  const serviceClientAny = serviceClient as any;
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
    const supabaseAny = supabase as any;

    if (!supabase) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

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

    // Update conversation's updated_at timestamp
    await supabaseAny
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
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
