// Supabase Edge Function to generate embeddings for experiences
// Can be triggered manually via HTTP or by cron job

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OpenAI } from 'https://esm.sh/openai@4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmbeddingResult {
  experienceId: string;
  title: string;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body for options
    const { 
      batchSize = 10, 
      maxExperiences = null,
      experienceIds = null // Optional: regenerate specific experiences
    } = await req.json().catch(() => ({}));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize OpenAI client
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    const openai = new OpenAI({ apiKey: openaiApiKey });

    console.log('Starting embedding generation...');
    console.log(`Batch size: ${batchSize}, Max experiences: ${maxExperiences || 'all'}`);

    // Find experiences that need embeddings
    let query = supabase
      .from('experiences')
      .select('id, title, type')
      .eq('status', 'published')
      .is('deleted_at', null);

    if (experienceIds && Array.isArray(experienceIds)) {
      // Regenerate specific experiences
      query = query.in('id', experienceIds);
      console.log(`Regenerating ${experienceIds.length} specific experiences`);
    } else {
      // Find experiences without embeddings
      query = query.is('embedding', null);
    }

    if (maxExperiences) {
      query = query.limit(maxExperiences);
    }

    const { data: experiences, error: fetchError } = await query.order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch experiences: ${fetchError.message}`);
    }

    if (!experiences || experiences.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No experiences need embeddings',
          processed: 0,
          results: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Found ${experiences.length} experiences to process`);

    const results: EmbeddingResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Process in batches
    for (let i = 0; i < experiences.length; i += batchSize) {
      const batch = experiences.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(experiences.length / batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches}...`);

      // Process batch concurrently
      const batchPromises = batch.map(async (experience) => {
        try {
          // Generate embedding text using database function
          const { data: embeddingText, error: textError } = await supabase
            .rpc('generate_experience_embedding_text', { exp_id: experience.id });

          if (textError || !embeddingText) {
            throw new Error(`Failed to generate embedding text: ${textError?.message || 'No text returned'}`);
          }

          // Generate embedding using OpenAI
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: embeddingText,
            encoding_format: 'float',
          });

          const embedding = embeddingResponse.data[0].embedding;

          // Update experience with embedding
          const { error: updateError } = await supabase
            .from('experiences')
            .update({ 
              embedding: JSON.stringify(embedding),
              updated_at: new Date().toISOString()
            })
            .eq('id', experience.id);

          if (updateError) {
            throw new Error(`Failed to update embedding: ${updateError.message}`);
          }

          console.log(`✓ Generated embedding for: ${experience.title}`);
          successCount++;
          
          return {
            experienceId: experience.id,
            title: experience.title,
            success: true,
          };
        } catch (error) {
          console.error(`✗ Failed for ${experience.title}:`, error);
          failedCount++;
          
          return {
            experienceId: experience.id,
            title: experience.title,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + batchSize < experiences.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Completed: ${successCount} successful, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${experiences.length} experiences`,
        processed: experiences.length,
        successful: successCount,
        failed: failedCount,
        results: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-embeddings function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
