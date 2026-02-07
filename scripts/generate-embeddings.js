#!/usr/bin/env node
/**
 * Generate embeddings for published experiences without embeddings.
 *
 * Usage:
 *   node scripts/generate-embeddings.js
 *
 * Optional env vars:
 *   BATCH_SIZE=10
 *   DELAY_MS=1000
 */
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateEmbeddingForExperience({ supabase, openai, experienceId, title }) {
  const { data: embeddingText, error: textError } = await supabase.rpc(
    'generate_experience_embedding_text',
    { exp_id: experienceId }
  );

  if (textError) {
    throw new Error(`Failed to build embedding text for "${title}": ${textError.message}`);
  }

  if (!embeddingText) {
    throw new Error(`No embedding text returned for "${title}"`);
  }

  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: embeddingText,
    encoding_format: 'float',
  });

  const embedding = embeddingResponse.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error(`OpenAI returned no embedding for "${title}"`);
  }

  const { error: updateError } = await supabase
    .from('experiences')
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', experienceId);

  if (updateError) {
    throw new Error(`Failed to save embedding for "${title}": ${updateError.message}`);
  }
}

async function main() {
  console.log('Starting embedding generation...\n');

  try {
    const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const openaiApiKey = getRequiredEnv('OPENAI_API_KEY');

    if (!supabaseKey) {
      throw new Error(
        'Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      );
    }

    const batchSize = Number(process.env.BATCH_SIZE || 10);
    const delayMs = Number(process.env.DELAY_MS || 1000);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    console.log('Configuration:');
    console.log(`- Batch size: ${batchSize}`);
    console.log(`- Delay between batches: ${delayMs}ms`);
    console.log(
      `- Supabase key type: ${
        process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'public (anon/publishable)'
      }\n`
    );

    const { data: experiences, error: fetchError } = await supabase
      .from('experiences')
      .select('id, title')
      .eq('status', 'published')
      .is('deleted_at', null)
      .is('embedding', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch experiences: ${fetchError.message}`);
    }

    if (!experiences?.length) {
      console.log('No experiences need embeddings.');
      return;
    }

    console.log(`Found ${experiences.length} experiences without embeddings.\n`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < experiences.length; i += batchSize) {
      const batch = experiences.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(experiences.length / batchSize)}`
      );

      const results = await Promise.allSettled(
        batch.map((experience) =>
          generateEmbeddingForExperience({
            supabase,
            openai,
            experienceId: experience.id,
            title: experience.title,
          })
        )
      );

      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const title = batch[index]?.title || batch[index]?.id;

        if (result.status === 'fulfilled') {
          success++;
          console.log(`  OK  ${title}`);
        } else {
          failed++;
          console.error(`  FAIL ${title}: ${result.reason?.message || 'Unknown error'}`);
        }
      }

      if (i + batchSize < experiences.length) {
        await sleep(delayMs);
      }
    }

    console.log('\nEmbedding generation completed.');
    console.log(`- Successful: ${success}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Total processed: ${success + failed}`);

    if (failed > 0) {
      console.log('\nSome embeddings failed. Check the logs above for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\nError generating embeddings:', error);
    process.exit(1);
  }
}

main();
