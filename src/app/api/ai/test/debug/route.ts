import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import { loadCatalogContext } from "@/lib/ai/catalog-context";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { searchExperiences } from "@/lib/ai/tools";

export const maxDuration = 30;

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export async function POST(_req: Request) {
  try {
    const todayDate = new Date().toISOString().split("T")[0];
    let systemPrompt = buildSystemPrompt(todayDate);
    const catalogContext = await loadCatalogContext();
    systemPrompt += catalogContext;

    const result = await generateText({
      model: openai("gpt-4.1-mini"),
      system: systemPrompt,
      messages: [{ role: "user", content: "je veux aller à marrakech" }],
      tools: { searchExperiences },
      stopWhen: stepCountIs(5),
      temperature: 0.4,
    });

    // Return the raw result structure
    return Response.json({
      text: result.text,
      finishReason: result.finishReason,
      stepsCount: result.steps.length,
      steps: result.steps.map((step, i) => ({
        stepIndex: i,
        text: step.text,
        toolCallsCount: step.toolCalls?.length || 0,
        toolCalls: step.toolCalls?.map((tc) => {
          const toolCall = tc as unknown as { input?: unknown; args?: unknown };
          return {
            toolName: tc.toolName,
            toolCallId: tc.toolCallId,
            argsKeys: Object.keys(toRecord(toolCall.input)),
            args: toolCall.args,
          };
        }),
        toolResultsCount: step.toolResults?.length || 0,
        toolResults: step.toolResults?.map((tr) => {
          const toolResult = tr as unknown as { result?: unknown };
          return {
            toolCallId: tr.toolCallId,
            resultKeys: Object.keys(toRecord(toolResult.result)),
            result: toolResult.result,
          };
        }),
      })),
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
