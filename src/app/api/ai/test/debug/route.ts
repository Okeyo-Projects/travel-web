import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs   } from 'ai';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { loadCatalogContext } from '@/lib/ai/catalog-context';
import { searchExperiences } from '@/lib/ai/tools';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const todayDate = new Date().toISOString().split('T')[0];
    let systemPrompt = buildSystemPrompt(todayDate);
    const catalogContext = await loadCatalogContext();
    systemPrompt += catalogContext;

    const result = await generateText({
      model: openai('gpt-4.1-mini'),
      system: systemPrompt,
      messages: [{ role: 'user', content: 'je veux aller à marrakech' }],
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
        toolCalls: step.toolCalls?.map(tc => ({
          toolName: tc.toolName,
          toolCallId: tc.toolCallId,
          argsKeys: Object.keys((tc as any).input || {}),
          args: (tc as any).args,
        })),
        toolResultsCount: step.toolResults?.length || 0,
        toolResults: step.toolResults?.map(tr => ({
          toolCallId: tr.toolCallId,
          resultKeys: Object.keys((tr as any).result || {}),
          result: (tr as any).result,
        })),
      })),
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
