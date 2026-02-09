import { openai } from '@ai-sdk/openai';
import { stepCountIs, streamText } from 'ai';

/** Simple message format for streamText (role + content); distinct from UIMessage which uses parts */
type ChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string };
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { loadCatalogContext } from '@/lib/ai/catalog-context';
import {
  searchExperiences,
  getExperienceDetails,
  checkAvailability,
  getExperiencePromos,
  validatePromoCode,
  findSimilar,
  requestUserLocation,
  getLinkedExperiences,
  createBookingIntent,
} from '@/lib/ai/tools';

export const maxDuration = 30;
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5.2';

// In-memory conversation storage (for testing only)
const conversations = new Map<string, ChatMessage[]>();

export async function POST(req: Request) {
  try {
    const { message, conversation_id, reset_context } = await req.json();

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Generate or use existing conversation ID
    const conversationId = conversation_id || `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Get or create conversation history
    let messages: ChatMessage[] = [];
    if (!reset_context && conversations.has(conversationId)) {
      messages = conversations.get(conversationId)!;
    }

    // Add user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Build system prompt with today's date
    const todayDate = new Date().toISOString().split('T')[0];
    let systemPrompt = buildSystemPrompt(todayDate);

    // Load catalog context
    const catalogContext = await loadCatalogContext();
    systemPrompt += catalogContext;

    const startTime = Date.now();

    // Use streamText but collect the full response
    const result = streamText({
      model: openai(CHAT_MODEL),
      system: systemPrompt,
      messages: messages,
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
      stopWhen: stepCountIs(6),
      temperature: 0.4,
    });

    // Collect the full response
    let fullText = '';
    const toolCalls: any[] = [];

    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        fullText += chunk.text;
      } else if (chunk.type === 'tool-call') {
        toolCalls.push({
          tool: chunk.toolName,
          arguments: chunk.input,
          toolCallId: chunk.toolCallId,
        });
      } else if (chunk.type === 'tool-result') {
        const toolCall = toolCalls.find(tc => tc.toolCallId === chunk.toolCallId);
        if (toolCall) {
          toolCall.result = chunk.output;
        }
      }
    }

    const responseTime = Date.now() - startTime;

    // Get usage information
    const usage = await result.usage;
    const finishReason = await result.finishReason;

    // Add assistant response to conversation
    messages.push({
      role: 'assistant',
      content: fullText,
    });

    // Store conversation
    conversations.set(conversationId, messages);

    // Clean up tool calls (remove toolCallId, keep only necessary info)
    const cleanedToolCalls = toolCalls.map(({ tool, arguments: args, result }) => ({
      tool,
      arguments: args,
      result,
    }));

    // Return complete response
    return Response.json({
      conversation_id: conversationId,
      message: fullText,
      tool_calls: cleanedToolCalls,
      metadata: {
        model: CHAT_MODEL,
        tokens_used: usage?.totalTokens || 0,
          prompt_tokens: (usage as any)?.promptTokens || 0,
          completion_tokens: (usage as any)?.completionTokens || 0,
        response_time_ms: responseTime,
        finish_reason: finishReason,
        tool_calls_count: toolCalls.length,
      },
    });
  } catch (error) {
    console.error('Test chat API error:', error);
    return Response.json(
      {
        error: 'Failed to process test chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
