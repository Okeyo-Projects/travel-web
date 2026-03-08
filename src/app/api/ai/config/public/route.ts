import { NextResponse } from "next/server";
import { loadAgentRuntimeConfig } from "@/lib/ai/agent-config";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const versionId = searchParams.get("versionId");

    const config = await loadAgentRuntimeConfig({
      overrideVersionId: versionId,
    });

    return NextResponse.json(
      {
        version_id: config.versionId,
        fallback_language: config.fallbackLanguage,
        supported_languages: config.supportedLanguages,
        welcome_messages: config.welcomeMessages,
        suggested_prompts: config.suggestedPrompts,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Public agent config API error:", error);
    return NextResponse.json(
      {
        error: "Failed to load agent config",
      },
      { status: 500 },
    );
  }
}
