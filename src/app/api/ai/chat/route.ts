import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import {
  searchExperiences,
  getExperienceDetails,
  checkAvailability,
  getExperiencePromos,
  validatePromoCode,
  findSimilar,
  requestUserLocation,
} from '@/lib/ai/tools';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';

export async function POST(req: Request) {
  try {
    const { messages = [], sessionId, userLocation } = await req.json();

    // Add user location context to system prompt if available
    let systemPrompt = SYSTEM_PROMPT;
    if (userLocation?.lat && userLocation?.lng) {
      systemPrompt += `\n\n## Current User Location\nLatitude: ${userLocation.lat}\nLongitude: ${userLocation.lng}\n\nUse these coordinates for distance-based searches without asking for location again.`;
    }

    const result = streamText({
      model: openai(CHAT_MODEL),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        searchExperiences,
        getExperienceDetails,
        checkAvailability,
        getExperiencePromos,
        validatePromoCode,
        findSimilar,
        requestUserLocation,
      },
      stopWhen: stepCountIs(5), // Allow multiple tool calls in sequence
      temperature: 0.7,
      onFinish: async ({ usage, finishReason }) => {
        // Log usage for monitoring (optional)
        console.log('Chat completion finished:', {
          sessionId,
          usage,
          finishReason,
          timestamp: new Date().toISOString(),
        });
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
