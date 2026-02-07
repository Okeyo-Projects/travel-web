import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for a text using OpenAI's text-embedding-3-small model
 * Returns a 1536-dimensional vector
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty for embedding');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embedding for a search query
 * This is an alias for embedText but can be extended with query-specific preprocessing
 */
export async function embedQuery(query: string): Promise<number[]> {
  // For now, use the same embedding function
  // In the future, we could add query-specific preprocessing like:
  // - Removing stop words
  // - Query expansion
  // - Intent detection
  return embedText(query);
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling embedText multiple times
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    throw new Error('Texts array cannot be empty');
  }

  // Filter out empty texts
  const validTexts = texts.filter(t => t && t.trim().length > 0);
  
  if (validTexts.length === 0) {
    throw new Error('No valid texts to embed');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: validTexts,
      encoding_format: 'float',
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
