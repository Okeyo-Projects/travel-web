import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { loadCatalogContext } from "@/lib/ai/catalog-context";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import {
  checkAvailability,
  createBookingIntent,
  findSimilar,
  getExperienceDetails,
  getExperiencePromos,
  getLinkedExperiences,
  requestUserLocation,
  searchExperiences,
  validatePromoCode,
} from "@/lib/ai/tools";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";

function dedupeInputMessages(rawMessages: unknown[]) {
  const deduped: unknown[] = [];
  const seenIds = new Set<string>();
  let previousSignature = "";

  for (const rawMessage of rawMessages) {
    if (!rawMessage || typeof rawMessage !== "object") continue;

    const message = rawMessage as {
      id?: unknown;
      role?: unknown;
      content?: unknown;
      parts?: unknown;
    };

    const id = typeof message.id === "string" ? message.id : null;
    if (id && seenIds.has(id)) {
      continue;
    }

    const role = typeof message.role === "string" ? message.role : "";
    const content =
      typeof message.content === "string" ? message.content.trim() : "";
    const parts =
      Array.isArray(message.parts) && message.parts.length > 0
        ? JSON.stringify(message.parts)
        : "";

    // Drop accidental adjacent duplicates caused by client rehydration races.
    const signature = `${role}|${content}|${parts}`;
    if (signature === previousSignature) {
      continue;
    }

    previousSignature = signature;
    if (id) seenIds.add(id);
    deduped.push(rawMessage);
  }

  return deduped;
}

export async function POST(req: Request) {
  try {
    const { messages = [], sessionId, userLocation } = await req.json();
    const safeMessages = dedupeInputMessages(
      Array.isArray(messages) ? messages : [],
    );

    // Build system prompt with today's date for smart date resolution
    const todayDate = new Date().toISOString().split("T")[0];
    let systemPrompt = buildSystemPrompt(todayDate);

    // Load catalog context so the AI knows what experiences are available
    const catalogContext = await loadCatalogContext();
    systemPrompt += catalogContext;

    // Add user location context if available
    if (userLocation?.lat && userLocation?.lng) {
      systemPrompt += `\n\n## Current User Location\nLatitude: ${userLocation.lat}\nLongitude: ${userLocation.lng}\n\nUse these coordinates for distance-based searches without asking for location again.`;
    }

    const result = streamText({
      model: openai(CHAT_MODEL),
      system: systemPrompt,
      messages: await convertToModelMessages(safeMessages),
      tools: {
        searchExperiences,
        getExperienceDetails,
        checkAvailability,
        getExperiencePromos,
        validatePromoCode,
        findSimilar,
        requestUserLocation,
        getLinkedExperiences,
        createBookingIntent,
      },
      stopWhen: stepCountIs(3), // Limit retries to avoid repeated empty tool loops
      temperature: 0.4, // Lower temperature for consistent, action-oriented responses
      onFinish: async ({ usage, finishReason }) => {
        // Log usage for monitoring (optional)
        console.log("Chat completion finished:", {
          sessionId,
          usage,
          finishReason,
          timestamp: new Date().toISOString(),
        });
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
