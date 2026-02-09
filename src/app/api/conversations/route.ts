import { createClient as createServiceClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function createServiceRoleClientOrThrow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role environment variables");
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

// POST /api/conversations - Create new conversation
export async function POST(req: NextRequest) {
  try {
    const { clientId, userLocation } = await req.json();
    const userClient = await createClient();
    const userClientAny = userClient as any;
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (user) {
      const { data, error } = await userClientAny
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          client_id: typeof clientId === "string" ? clientId : null,
          user_location: userLocation || null,
        })
        .select("id, created_at")
        .single();

      if (error) throw error;
      return NextResponse.json({ conversation: data });
    }

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json(
        { error: "clientId is required for anonymous conversations" },
        { status: 400 },
      );
    }

    const serviceClient = createServiceRoleClientOrThrow();
    const serviceClientAny = serviceClient as any;

    const { data, error } = await serviceClientAny
      .from("ai_conversations")
      .insert({
        user_id: null,
        client_id: clientId,
        user_location: userLocation || null,
      })
      .select("id, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}

// GET /api/conversations - List user's conversations
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAny = supabase as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get clientId from query params for anonymous users
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    // For authenticated users, query by user_id
    if (user) {
      const { data, error } = await supabaseAny
        .from("ai_conversations")
        .select("id, title, first_message, created_at, updated_at")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return NextResponse.json({ conversations: data || [] });
    }

    // For anonymous users, use service role and query by client_id
    if (clientId) {
      const serviceClient = createServiceRoleClientOrThrow();
      const serviceClientAny = serviceClient as any;

      const { data, error } = await serviceClientAny
        .from("ai_conversations")
        .select("id, title, first_message, created_at, updated_at")
        .eq("client_id", clientId)
        .is("user_id", null)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return NextResponse.json({ conversations: data || [] });
    }

    return NextResponse.json({ conversations: [] });
  } catch (error) {
    console.error("List conversations error:", error);
    return NextResponse.json(
      { error: "Failed to list conversations" },
      { status: 500 },
    );
  }
}
