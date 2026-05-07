import { createClient } from "@/lib/supabase/server";
import {
  EXPERIENCE_EMBEDDING_MODEL,
  embedText,
  hashEmbeddingText,
} from "./index";

/**
 * Generate and save embedding for a specific experience
 * This fetches the experience data, generates embedding text, and updates the database
 */
export async function generateExperienceEmbedding(
  experienceId: string,
  sourceChangedAt?: string | null,
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const db = supabase as any;

    const { data: runningSourceChangedAt } = await db.rpc(
      "record_experience_embedding_running",
      {
        p_experience_id: experienceId,
      },
    );
    const effectiveSourceChangedAt =
      sourceChangedAt || runningSourceChangedAt || null;

    // Call the database function to generate embedding text
    const { data: embeddingTextData, error: textError } = await db.rpc(
      "generate_experience_embedding_text",
      { exp_id: experienceId },
    );

    if (textError) {
      console.error(
        `Error generating embedding text for experience ${experienceId}:`,
        textError,
      );
      await db.rpc("record_experience_embedding_failed", {
        p_experience_id: experienceId,
        p_error_message: textError.message || "Failed to build embedding text",
      });
      return false;
    }

    if (!embeddingTextData) {
      console.warn(
        `No embedding text generated for experience ${experienceId}`,
      );
      await db.rpc("record_experience_embedding_failed", {
        p_experience_id: experienceId,
        p_error_message: "No embedding text generated",
      });
      return false;
    }

    // Generate the embedding using OpenAI
    console.log(`Generating embedding for experience ${experienceId}...`);
    const embedding = await embedText(embeddingTextData);
    const embeddingTextHash = hashEmbeddingText(embeddingTextData);

    // Update the experience with the embedding
    const { error: updateError } = await db
      .from("experiences")
      .update({ embedding: JSON.stringify(embedding) })
      .eq("id", experienceId);

    if (updateError) {
      console.error(
        `Error updating embedding for experience ${experienceId}:`,
        updateError,
      );
      await db.rpc("record_experience_embedding_failed", {
        p_experience_id: experienceId,
        p_error_message: updateError.message || "Failed to update embedding",
      });
      return false;
    }

    await db.rpc("record_experience_embedding_synced", {
      p_experience_id: experienceId,
      p_embedding_model: EXPERIENCE_EMBEDDING_MODEL,
      p_embedding_text_hash: embeddingTextHash,
      p_source_changed_at: effectiveSourceChangedAt,
    });

    console.log(
      `Successfully generated embedding for experience ${experienceId}`,
    );
    return true;
  } catch (error) {
    console.error(
      `Failed to generate embedding for experience ${experienceId}:`,
      error,
    );
    try {
      const supabase = await createClient();
      const db = supabase as any;
      await db.rpc("record_experience_embedding_failed", {
        p_experience_id: experienceId,
        p_error_message:
          error instanceof Error ? error.message : "Unknown error",
      });
    } catch {
      // Best-effort failure tracking only.
    }
    return false;
  }
}

/**
 * Generate embeddings for all experiences without embeddings
 * Processes in batches to respect rate limits
 */
export async function generateAllMissingEmbeddings(
  batchSize: number = 10,
  delayMs: number = 1000,
): Promise<{ success: number; failed: number }> {
  const supabase = await createClient();
  const db = supabase as any;
  const results = { success: 0, failed: 0 };

  try {
    // Find published experiences whose source data changed since the last embedding.
    const { data: experiences, error } = await db.rpc(
      "get_experiences_needing_embedding",
      { p_limit: 1000 },
    );

    if (error) {
      console.error("Error fetching experiences:", error);
      return results;
    }

    if (!experiences || experiences.length === 0) {
      console.log("No experiences need embeddings");
      return results;
    }

    console.log(`Found ${experiences.length} experiences needing embeddings`);

    // Process in batches
    for (let i = 0; i < experiences.length; i += batchSize) {
      const batch = experiences.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(experiences.length / batchSize)}`,
      );

      // Process batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map((exp: any) =>
          generateExperienceEmbedding(
            exp.experience_id || exp.id,
            exp.last_experience_changed_at || null,
          ),
        ),
      );

      // Count results
      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          results.success++;
        } else {
          results.failed++;
          console.error(
            `Failed to generate embedding for ${batch[index].title}`,
          );
        }
      });

      // Delay between batches to respect rate limits
      if (i + batchSize < experiences.length) {
        console.log(`Waiting ${delayMs}ms before next batch...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    console.log(
      `Completed: ${results.success} successful, ${results.failed} failed`,
    );
    return results;
  } catch (error) {
    console.error("Error in generateAllMissingEmbeddings:", error);
    return results;
  }
}

/**
 * Regenerate embedding for an experience (when content changes)
 * This is useful when experience data is updated
 */
export async function regenerateExperienceEmbedding(
  experienceId: string,
): Promise<boolean> {
  console.log(`Regenerating embedding for experience ${experienceId}`);
  return generateExperienceEmbedding(experienceId);
}
