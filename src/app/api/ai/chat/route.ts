import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { AgentToolName } from "@/lib/ai/agent-config";
import { loadAgentRuntimeConfig } from "@/lib/ai/agent-config";
import { loadCatalogContext } from "@/lib/ai/catalog-context";
import { aiDebug } from "@/lib/ai/debug-log";
import { buildAgentPromptFromConfig } from "@/lib/ai/prompt-builder";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import {
  checkAvailability,
  createBookingIntent,
  findSimilar,
  getExperienceOptionDetails,
  getExperienceDetails,
  getExperiencePromos,
  getLinkedExperiences,
  offerQuickReplies,
  selectRoomType,
  requestUserLocation,
  searchExperiences,
  suggestDateOptions,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function supportsTemperature(model: string): boolean {
  // Reasoning families currently ignore or reject temperature.
  return !/^(gpt-5|o1|o3|o4)([-.:]|$)/i.test(model);
}

function extractRecentEntityContext(rawMessages: unknown[]): {
  promptBlock: string;
  roomHintsCount: number;
  experienceHintsCount: number;
} {
  const roomHints: Array<{
    experienceId: string;
    experienceTitle: string;
    roomTypeId: string;
    roomName: string;
  }> = [];
  const experienceHints: Array<{
    experienceId: string;
    title: string;
    type: string;
    city: string;
    region: string;
  }> = [];

  for (let i = rawMessages.length - 1; i >= 0; i -= 1) {
    const message = rawMessages[i];
    if (!isRecord(message) || !Array.isArray(message.parts)) continue;

    for (let j = message.parts.length - 1; j >= 0; j -= 1) {
      const rawPart = message.parts[j];
      if (!isRecord(rawPart)) continue;
      if (rawPart.state !== "output-available") continue;
      if (!isRecord(rawPart.output) || rawPart.output.success !== true) continue;

      if (rawPart.type === "tool-selectRoomType") {
        const output = rawPart.output;
        const experience = isRecord(output.experience) ? output.experience : null;
        const experienceId =
          experience && typeof experience.id === "string" ? experience.id : "";
        const experienceTitle =
          experience && typeof experience.title === "string"
            ? experience.title
            : "Unknown lodging";
        const experienceType =
          experience && typeof experience.type === "string"
            ? experience.type
            : "lodging";
        const experienceCity =
          experience && typeof experience.city === "string"
            ? experience.city
            : "";
        const experienceRegion =
          experience && typeof experience.region === "string"
            ? experience.region
            : "";

        if (!experienceId || !Array.isArray(output.rooms)) continue;
        experienceHints.push({
          experienceId,
          title: experienceTitle,
          type: experienceType,
          city: experienceCity,
          region: experienceRegion,
        });
        for (const room of output.rooms) {
          if (!isRecord(room)) continue;
          if (
            typeof room.room_type_id !== "string" ||
            typeof room.name !== "string"
          ) {
            continue;
          }
          roomHints.push({
            experienceId,
            experienceTitle,
            roomTypeId: room.room_type_id,
            roomName: room.name,
          });
        }
      }

      if (rawPart.type === "tool-getExperienceDetails") {
        const output = rawPart.output;
        const experience = isRecord(output.experience) ? output.experience : null;
        const experienceId =
          experience && typeof experience.id === "string" ? experience.id : "";
        const experienceTitle =
          experience && typeof experience.title === "string"
            ? experience.title
            : "Unknown lodging";
        const experienceType =
          experience && typeof experience.type === "string"
            ? experience.type
            : "";
        const experienceCity =
          experience && typeof experience.city === "string"
            ? experience.city
            : "";
        const experienceRegion =
          experience && typeof experience.region === "string"
            ? experience.region
            : "";

        if (!experienceId) continue;
        experienceHints.push({
          experienceId,
          title: experienceTitle,
          type: experienceType,
          city: experienceCity,
          region: experienceRegion,
        });
        if (!Array.isArray(output.room_types)) continue;
        for (const room of output.room_types) {
          if (!isRecord(room) || typeof room.id !== "string") continue;
          const roomName =
            typeof room.name === "string"
              ? room.name
              : typeof room.type === "string"
                ? room.type
                : "Room";
          roomHints.push({
            experienceId,
            experienceTitle,
            roomTypeId: room.id,
            roomName,
          });
        }
      }

      if (rawPart.type === "tool-searchExperiences") {
        const output = rawPart.output;
        if (!Array.isArray(output.results)) continue;
        for (const result of output.results) {
          if (!isRecord(result)) continue;
          if (typeof result.id !== "string") continue;
          experienceHints.push({
            experienceId: result.id,
            title: typeof result.title === "string" ? result.title : "Unknown",
            type: typeof result.type === "string" ? result.type : "",
            city: typeof result.city === "string" ? result.city : "",
            region: typeof result.region === "string" ? result.region : "",
          });

          if (result.type !== "lodging") continue;
          if (!Array.isArray(result.rooms)) continue;
          for (const room of result.rooms) {
            if (!isRecord(room)) continue;
            if (
              typeof room.room_type_id !== "string" ||
              typeof room.name !== "string"
            ) {
              continue;
            }
            roomHints.push({
              experienceId: result.id,
              experienceTitle:
                typeof result.title === "string" ? result.title : "Unknown lodging",
              roomTypeId: room.room_type_id,
              roomName: room.name,
            });
          }
        }
      }
    }

    if (roomHints.length >= 8 && experienceHints.length >= 8) break;
  }

  const dedupedExperiences: typeof experienceHints = [];
  const seenExperienceIds = new Set<string>();
  for (const hint of experienceHints) {
    if (seenExperienceIds.has(hint.experienceId)) continue;
    seenExperienceIds.add(hint.experienceId);
    dedupedExperiences.push(hint);
    if (dedupedExperiences.length >= 8) break;
  }

  const deduped: typeof roomHints = [];
  const seen = new Set<string>();
  for (const hint of roomHints) {
    if (seen.has(hint.roomTypeId)) continue;
    seen.add(hint.roomTypeId);
    deduped.push(hint);
    if (deduped.length >= 6) break;
  }

  if (deduped.length === 0 && dedupedExperiences.length === 0) {
    return {
      promptBlock: "",
      roomHintsCount: 0,
      experienceHintsCount: 0,
    };
  }

  const lines = [
    "",
    "",
    "## RECENT ENTITY CONTEXT",
  ];

  if (dedupedExperiences.length > 0) {
    lines.push(
      "If user asks for details about an experience by name, use these exact experience_ids:",
    );
    lines.push(
      ...dedupedExperiences.map((hint) => {
        const location = [hint.city, hint.region].filter(Boolean).join(", ");
        return `- ${hint.title} (experience_id: ${hint.experienceId}, type: ${hint.type || "unknown"}${location ? `, location: ${location}` : ""})`;
      }),
    );
  }

  if (deduped.length > 0) {
    const primary = deduped[0];
    lines.push(
      'If user refers to "this room" or room name, resolve with these room_type_ids first:',
    );
    lines.push(
      `- Last lodging: "${primary.experienceTitle}" (experience_id: ${primary.experienceId})`,
    );
    lines.push(
      ...deduped.map(
        (hint) =>
          `- ${hint.roomName} (room_type_id: ${hint.roomTypeId}, experience_id: ${hint.experienceId})`,
      ),
    );
  }

  return {
    promptBlock: lines.join("\n"),
    roomHintsCount: deduped.length,
    experienceHintsCount: dedupedExperiences.length,
  };
}

export async function POST(req: Request) {
  try {
    const requestId = crypto.randomUUID().slice(0, 8);
    const {
      messages = [],
      sessionId,
      userLocation,
      configVersionId,
    } = await req.json();
    const safeMessages = dedupeInputMessages(
      Array.isArray(messages) ? messages : [],
    );

    aiDebug("chat.route", "request_received", {
      requestId,
      sessionId: typeof sessionId === "string" ? sessionId : null,
      configVersionId: typeof configVersionId === "string" ? configVersionId : null,
      rawMessagesCount: Array.isArray(messages) ? messages.length : 0,
      dedupedMessagesCount: safeMessages.length,
    });

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
      offerQuickReplies,
      suggestDateOptions,
      selectRoomType,
      getExperienceOptionDetails,
    };

    // Keep interactive quick replies available even if older config versions
    // have an outdated enabled_tools list.
    const enabledToolNames = new Set<AgentToolName>([
      ...agentConfig.enabledTools,
      "offerQuickReplies",
      "suggestDateOptions",
      "selectRoomType",
      "getExperienceOptionDetails",
    ]);

    const enabledTools = Object.fromEntries(
      Object.entries(allTools).filter(([toolName]) =>
        enabledToolNames.has(toolName as AgentToolName),
      ),
    );

    const effectiveTools =
      Object.keys(enabledTools).length > 0 ? enabledTools : allTools;

    aiDebug("chat.route", "runtime_config_loaded", {
      requestId,
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      maxSteps: agentConfig.maxSteps,
      enabledTools: Object.keys(effectiveTools),
    });

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

    const recentEntityContext = extractRecentEntityContext(safeMessages);
    if (recentEntityContext.promptBlock) {
      systemPrompt += recentEntityContext.promptBlock;
      aiDebug("chat.route", "recent_entity_context_injected", {
        requestId,
        roomHintsCount: recentEntityContext.roomHintsCount,
        experienceHintsCount: recentEntityContext.experienceHintsCount,
      });
    } else {
      aiDebug("chat.route", "recent_entity_context_empty", {
        requestId,
      });
    }

    // Runtime safety override for specific option detail requests.
    systemPrompt += `\n\n## CRITICAL DETAIL RETRIEVAL RULE\nWhen the user asks details about a specific room, departure, or session, you MUST call getExperienceOptionDetails before answering.\nNever claim you cannot access room/session/departure details without attempting the relevant tool call first.`;
    systemPrompt += `\n\n## CRITICAL EXPERIENCE DETAIL RULE\nWhen the user asks details about a specific experience by name, resolve the exact experience_id from recent tool outputs.\nIf no reliable ID is available, call searchExperiences(query=user wording, limit=4) first, then call getExperienceDetails with the returned ID.\nNever claim "experience not found" without trying that fallback path.`;

    // Add user location context if available
    if (userLocation?.lat && userLocation?.lng) {
      systemPrompt += `\n\n## Current User Location\nLatitude: ${userLocation.lat}\nLongitude: ${userLocation.lng}\n\nUse these coordinates for distance-based searches without asking for location again.`;
    }

    aiDebug("chat.route", "request_ready_for_model", {
      requestId,
      promptLength: systemPrompt.length,
      hasUserLocation: Boolean(userLocation?.lat && userLocation?.lng),
    });

    const canSetTemperature = supportsTemperature(agentConfig.model);
    if (!canSetTemperature) {
      aiDebug("chat.route", "temperature_omitted_for_model", {
        requestId,
        model: agentConfig.model,
        configuredTemperature: agentConfig.temperature,
      });
    }

    const result = streamText({
      model: openai(agentConfig.model),
      system: systemPrompt,
      messages: await convertToModelMessages(safeMessages as any),
      tools: effectiveTools,
      stopWhen: stepCountIs(agentConfig.maxSteps),
      ...(canSetTemperature ? { temperature: agentConfig.temperature } : {}),
      onFinish: async ({ usage, finishReason }) => {
        // Log usage for monitoring (optional)
        console.log("Chat completion finished:", {
          requestId,
          sessionId,
          configVersionId: agentConfig.versionId,
          model: agentConfig.model,
          usage,
          finishReason,
          timestamp: new Date().toISOString(),
        });
        aiDebug("chat.route", "completion_finished", {
          requestId,
          finishReason,
          totalTokens: usage?.totalTokens ?? null,
          promptTokens: (usage as any)?.promptTokens ?? null,
          completionTokens: (usage as any)?.completionTokens ?? null,
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
