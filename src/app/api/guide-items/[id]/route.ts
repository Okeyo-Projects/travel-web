import { NextResponse } from "next/server";
import { mapGuideItemRowToChatCardData } from "@/lib/guide-items";
import { resolveLocale } from "@/lib/i18n";
import { createServiceRoleClientOrThrow } from "@/lib/supabase/service-role";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const locale = resolveLocale(
      new URL(request.url).searchParams.get("locale"),
    );

    if (!id) {
      return NextResponse.json(
        { error: "Guide item id is required." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClientOrThrow();
    const { data, error } = await supabase
      .from("guide_items")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error("Guide item detail endpoint query error:", error);
      return NextResponse.json(
        { error: "Failed to load guide item." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Guide item not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      item: mapGuideItemRowToChatCardData(data, locale),
    });
  } catch (error) {
    console.error("Guide item detail endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to load guide item." },
      { status: 500 },
    );
  }
}
