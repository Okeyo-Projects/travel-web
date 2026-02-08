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

    // Use service role for anonymous users
    const supabase = user ? userClient : createServiceRoleClientOrThrow();

    const sanitizedParts = sanitizeMessageParts(message.parts);
    const contentFromMessage =
      typeof message.content === "string" ? message.content.trim() : "";
    const contentFromParts = extractTextFromParts(sanitizedParts);
    const content = contentFromMessage || contentFromParts || null;

    const { data, error } = await supabase
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
    await supabase
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
