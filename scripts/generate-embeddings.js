#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
/**
 * Generate embeddings for published experiences with missing or stale embeddings.
 *
 * Usage:
 *   node scripts/generate-embeddings.js
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 *
 * Optional env vars:
 *   BATCH_SIZE=10
 *   DELAY_MS=1000
 *   MAX_EXPERIENCES=1000
 */
import OpenAI from "openai";

const EXPERIENCE_EMBEDDING_MODEL = "text-embedding-3-large";
const EXPERIENCE_EMBEDDING_DIMENSIONS = 1536;

if (typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env");
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

function hashEmbeddingText(text) {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Truncate text to a safe character limit for the embedding model.
 * text-embedding-3-large has an 8192-token context window.
 * A conservative estimate is ~3 chars/token for French/English mixed text.
 */
function truncateForEmbedding(text, maxChars = 24000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

async function generateEmbeddingForExperience({
  supabase,
  openai,
  experienceId,
  sourceChangedAt,
  title,
}) {
  const { data: runningSourceChangedAt } = await supabase.rpc(
    "record_experience_embedding_running",
    {
      p_experience_id: experienceId,
    },
  );
  const effectiveSourceChangedAt =
    sourceChangedAt || runningSourceChangedAt || null;

  const { data: embeddingText, error: textError } = await supabase.rpc(
    "generate_experience_embedding_text",
    { exp_id: experienceId },
  );

  if (textError) {
    throw new Error(
      `Failed to build embedding text for "${title}": ${textError.message}`,
    );
  }

  if (!embeddingText) {
    throw new Error(`No embedding text returned for "${title}"`);
  }

  const embeddingInput = truncateForEmbedding(String(embeddingText));
  const embeddingResponse = await openai.embeddings.create({
    model: EXPERIENCE_EMBEDDING_MODEL,
    input: embeddingInput,
    dimensions: EXPERIENCE_EMBEDDING_DIMENSIONS,
    encoding_format: "float",
  });

  const embedding = embeddingResponse.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error(`OpenAI returned no embedding for "${title}"`);
  }

  const { error: updateError } = await supabase
    .from("experiences")
    .update({ embedding: JSON.stringify(embedding) })
    .eq("id", experienceId);

  if (updateError) {
    throw new Error(
      `Failed to save embedding for "${title}": ${updateError.message}`,
    );
  }

  const { error: syncError } = await supabase.rpc(
    "record_experience_embedding_synced",
    {
      p_experience_id: experienceId,
      p_embedding_model: EXPERIENCE_EMBEDDING_MODEL,
      p_embedding_text_hash: hashEmbeddingText(embeddingInput),
      p_source_changed_at: effectiveSourceChangedAt,
    },
  );

  if (syncError) {
    throw new Error(
      `Failed to update embedding sync state for "${title}": ${syncError.message}`,
    );
  }
}

async function main() {
  console.log("Starting embedding generation...\n");

  try {
    const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const openaiApiKey = getRequiredEnv("OPENAI_API_KEY");

    const batchSize = Number(process.env.BATCH_SIZE || 10);
    const delayMs = Number(process.env.DELAY_MS || 1000);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    console.log("Configuration:");
    console.log(`- Batch size: ${batchSize}`);
    console.log(`- Delay between batches: ${delayMs}ms`);
    console.log("- Supabase key type: service_role\n");

    const { data: experiences, error: fetchError } = await supabase.rpc(
      "get_experiences_needing_embedding",
      { p_limit: Number(process.env.MAX_EXPERIENCES || 1000) },
    );

    if (fetchError) {
      throw new Error(`Failed to fetch experiences: ${fetchError.message}`);
    }

    if (!experiences?.length) {
      console.log("No experiences need embeddings.");
      return;
    }

    console.log(
      `Found ${experiences.length} experiences needing embeddings.\n`,
    );

    let success = 0;
    let failed = 0;

    for (let i = 0; i < experiences.length; i += batchSize) {
      const batch = experiences.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(experiences.length / batchSize)}`,
      );

      const results = await Promise.allSettled(
        batch.map((experience) =>
          generateEmbeddingForExperience({
            supabase,
            openai,
            experienceId: experience.experience_id,
            sourceChangedAt: experience.last_experience_changed_at,
            title: experience.title,
          }),
        ),
      );

      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const title = batch[index]?.title || batch[index]?.experience_id;

        if (result.status === "fulfilled") {
          success++;
          console.log(`  OK  ${title}`);
        } else {
          failed++;
          if (batch[index]?.experience_id) {
            await supabase.rpc("record_experience_embedding_failed", {
              p_experience_id: batch[index].experience_id,
              p_error_message: result.reason?.message || "Unknown error",
            });
          }
          console.error(
            `  FAIL ${title}: ${result.reason?.message || "Unknown error"}`,
          );
        }
      }

      if (i + batchSize < experiences.length) {
        await sleep(delayMs);
      }
    }

    console.log("\nEmbedding generation completed.");
    console.log(`- Successful: ${success}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Total processed: ${success + failed}`);

    if (failed > 0) {
      console.log(
        "\nSome embeddings failed. Check the logs above for details.",
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("\nError generating embeddings:", error);
    process.exit(1);
  }
}

main();
