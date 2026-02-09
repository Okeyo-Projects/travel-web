import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { AgentToolName } from "@/lib/ai/agent-config";
import { loadAgentRuntimeConfig } from "@/lib/ai/agent-config";
import { loadCatalogContext } from "@/lib/ai/catalog-context";
import { buildAgentPromptFromConfig } from "@/lib/ai/prompt-builder";
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
    const {
      messages = [],
      sessionId,
      userLocation,
      configVersionId,
    } = await req.json();
    const safeMessages = dedupeInputMessages(
      Array.isArray(messages) ? messages : [],
    );

    const agentConfig = await loadAgentRuntimeConfig({
      overrideVersionId:
        typeof configVersionId === "string" ? configVersionId : null,
    });

    const allTools = {
      searchExperiences,
      getExperienceDetails,
      checkAvailability,
      getExperiencePromos,
      validatePromoCode,
      findSimilar,
      requestUserLocation,
      getLinkedExperiences,
      createBookingIntent,
    };

    const enabledTools = Object.fromEntries(
      Object.entries(allTools).filter(([toolName]) =>
        agentConfig.enabledTools.includes(toolName as AgentToolName),
      ),
    );

    const effectiveTools =
      Object.keys(enabledTools).length > 0 ? enabledTools : allTools;

    // Build system prompt with today's date for smart date resolution
    const todayDate = new Date().toISOString().split("T")[0];
    let systemPrompt =
      buildAgentPromptFromConfig({
        config: agentConfig,
        todayDate,
        enabledTools: Object.keys(effectiveTools),
      }) || buildSystemPrompt(todayDate);

    // Load catalog context so the AI knows what experiences are available
    const catalogContext = await loadCatalogContext();
    if (systemPrompt.includes("{{CATALOG_CONTEXT}}")) {
      systemPrompt = systemPrompt.replaceAll(
        "{{CATALOG_CONTEXT}}",
        catalogContext,
      );
    } else {
      systemPrompt += catalogContext;
    }

    // Add user location context if available
    if (userLocation?.lat && userLocation?.lng) {
      systemPrompt += `\n\n## Current User Location\nLatitude: ${userLocation.lat}\nLongitude: ${userLocation.lng}\n\nUse these coordinates for distance-based searches without asking for location again.`;
    }

    const result = streamText({
      model: openai(agentConfig.model),
      system: systemPrompt,
      messages: await convertToModelMessages(safeMessages as any),
      tools: effectiveTools,
      stopWhen: stepCountIs(agentConfig.maxSteps),
      temperature: agentConfig.temperature,
      onFinish: async ({ usage, finishReason }) => {
        // Log usage for monitoring (optional)
        console.log("Chat completion finished:", {
          sessionId,
          configVersionId: agentConfig.versionId,
          model: agentConfig.model,
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
