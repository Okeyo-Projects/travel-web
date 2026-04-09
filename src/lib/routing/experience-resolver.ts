import {
  type ExperienceDetailResponse,
  SELECT_EXPERIENCE_DETAIL,
  transformRecord,
} from "@/hooks/use-experience-detail";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseExperienceRecord } from "@/types/experience-detail";
import { buildExperienceSlug } from "./slugs";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeIdentifier(value: string): string {
  return decodeURIComponent(value).trim().toLowerCase();
}

export async function resolveExperienceId(
  identifier: string,
): Promise<string | null> {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;

  // 1. Direct UUID
  if (UUID_REGEX.test(normalized)) {
    return normalized;
  }

  const supabase = await createClient();

  // 2. Slug column match
  const { data: bySlug } = await supabase
    .from("experiences" as never)
    .select("id")
    .eq("slug" as never, normalized)
    .eq("status" as never, "published")
    .is("deleted_at" as never, null)
    .maybeSingle<{ id: string }>();

  if (bySlug?.id) return bySlug.id;

  // 3. Composite slug fallback for records without a persisted slug.
  const { data: candidates } = await supabase
    .from("experiences" as never)
    .select("id, title, slug")
    .eq("status" as never, "published")
    .is("deleted_at" as never, null)
    .limit(500);

  if (candidates && Array.isArray(candidates)) {
    const typedCandidates = candidates as Array<{
      id: string;
      title: string;
      slug?: string | null;
    }>;

    const match = typedCandidates.find((candidate) => {
      const storedSlug =
        typeof candidate.slug === "string"
          ? candidate.slug.trim().toLowerCase()
          : null;

      if (storedSlug && storedSlug === normalized) {
        return true;
      }

      return (
        buildExperienceSlug({
          title: candidate.title,
          id: candidate.id,
        }) === normalized
      );
    });

    if (match) return match.id;
  }

  return null;
}

export async function fetchExperienceData(
  identifier: string,
): Promise<ExperienceDetailResponse> {
  try {
    const experienceId = await resolveExperienceId(identifier);
    if (!experienceId) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("experiences" as never)
      .select(SELECT_EXPERIENCE_DETAIL)
      .eq("id" as never, experienceId)
      .maybeSingle<SupabaseExperienceRecord>();

    if (error || !data) return null;

    return { transformed: transformRecord(data), raw: data };
  } catch (err) {
    console.error("Error fetching experience data:", err);
    return null;
  }
}
