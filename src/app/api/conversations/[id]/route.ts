import { createClient as createServiceClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LooseQueryResult<T = unknown> = Promise<{ data: T; error: unknown }>;
type LooseQueryPayload = { data: unknown; error: unknown };

type LooseQueryBuilder = PromiseLike<LooseQueryPayload> & {
  update(values: Record<string, unknown>): LooseQueryBuilder;
  select(columns?: string): LooseQueryBuilder;
  eq(column: string, value: unknown): LooseQueryBuilder;
  is(column: string, value: unknown): LooseQueryBuilder;
  maybeSingle(): LooseQueryResult<unknown>;
  order(column: string, options?: { ascending?: boolean }): LooseQueryBuilder;
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

async function resolveAuthorizedConversation(
  req: NextRequest,
  conversationId: string,
  userClient: Awaited<ReturnType<typeof createClient>>,
  userId: string | null,
) {
  const userClientAny = asLooseSupabaseClient(userClient);

  if (userId) {
    const { data: userConversation, error: userError } = await userClientAny
      .from("ai_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (userError) throw userError;
    if (userConversation) {
      return { conversation: userConversation, supabase: userClient };
    }
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) return null;

  const serviceClient = createServiceRoleClientOrThrow();
  const serviceClientAny = asLooseSupabaseClient(serviceClient);
  const { data: anonymousConversation, error: anonymousError } =
    await serviceClientAny
      .from("ai_conversations")
      .select("*")
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
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();

    if (claimedError) throw claimedError;
    if (claimedConversation) {
      return { conversation: claimedConversation, supabase: userClient };
    }
  }

  return { conversation: anonymousConversation, supabase: serviceClient };
}

// GET /api/conversations/[id] - Get conversation with messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params;

    const userClient = await createClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();

    const authorized = await resolveAuthorizedConversation(
      req,
      conversationId,
      userClient,
      user?.id ?? null,
    );

    if (!authorized) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const authorizedSupabaseAny = asLooseSupabaseClient(authorized.supabase);

    const { data: messages, error: msgError } = await authorizedSupabaseAny
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;

    return NextResponse.json({
      conversation: authorized.conversation,
      messages: messages || [],
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json(
      { error: "Failed to get conversation" },
      { status: 404 },
    );
  }
}

// DELETE /api/conversations/[id] - Archive conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params;

    const userClient = await createClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();

    const authorized = await resolveAuthorizedConversation(
      req,
      conversationId,
      userClient,
      user?.id ?? null,
    );

    if (!authorized) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const authorizedSupabaseAny = asLooseSupabaseClient(authorized.supabase);
    const { error } = await authorizedSupabaseAny
      .from("ai_conversations")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", conversationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Archive conversation error:", error);
    return NextResponse.json(
      { error: "Failed to archive conversation" },
      { status: 500 },
    );
  }
}
