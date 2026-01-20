import { streamText } from 'ai';
// import { openai } from '@ai-sdk/openai'; // Assuming openai is installed or I can mock it.
// Since I don't have an API key, I'll use a mock stream or a simple response.

// Mocking the response for demo purposes since we don't have an API key
export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  // Simple mock response generator
  const mockResponse = `Je suis l'assistant Okeyo. Vous avez dit : "${lastMessage.content}". 
  
Je peux vous aider à trouver des expériences de voyage, des hébergements ou des activités. Dites-moi simplement ce que vous recherchez !
  
Par exemple : "Je cherche un séjour romantique à Bali" ou "Quelles sont les activités à faire à Tokyo ?"`;

  // Create a stream from the mock response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const words = mockResponse.split(' ');
      for (const word of words) {
        controller.enqueue(encoder.encode(word + ' '));
        await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate typing delay
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
