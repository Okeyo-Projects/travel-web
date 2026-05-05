import {
  buildRoomItemsMap,
  type ExperienceDetailResponse,
  SELECT_EXPERIENCE_DETAIL,
  transformRecord,
} from "@/hooks/use-experience-detail";
import { type AppLocale, resolveLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseExperienceRecord } from "@/types/experience-detail";
import {
  buildExperienceSlug,
  buildLegacyExperienceSlug,
  getExperienceIdSegmentFromIdentifier,
} from "./slugs";

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

  // 3. Legacy slug fallback: if the title changed, use the trailing UUID prefix.
  const legacyIdSegment = getExperienceIdSegmentFromIdentifier(normalized);

  if (legacyIdSegment) {
    const { data: byLegacyIdSegment } = await supabase
      .from("experiences" as never)
      .select("id")
      .like("id" as never, `${legacyIdSegment}-%`)
      .eq("status" as never, "published")
      .is("deleted_at" as never, null)
      .limit(2)
      .returns<Array<{ id: string }>>();

    if (byLegacyIdSegment?.length === 1) {
      return byLegacyIdSegment[0]?.id ?? null;
    }
  }

  // 4. Composite slug fallback for records without a persisted slug.
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
        buildLegacyExperienceSlug({
          title: candidate.title,
          id: candidate.id,
          slug: candidate.slug,
        }) === normalized ||
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
  locale: AppLocale = resolveLocale(null),
): Promise<ExperienceDetailResponse> {
  try {
    const experienceId = await resolveExperienceId(identifier);
    if (!experienceId) return null;

    const supabase = await createClient();

    const [{ data, error }, roomItemsResult] = await Promise.all([
      supabase
        .from("experiences" as never)
        .select(SELECT_EXPERIENCE_DETAIL)
        .eq("id" as never, experienceId)
        .maybeSingle<SupabaseExperienceRecord>(),
      supabase.from("room_items" as never).select("key, category, name, icon"),
    ]);

    if (error || !data) return null;

    const roomItemsMap = buildRoomItemsMap(
      (roomItemsResult.data ?? []) as Array<{
        key: string;
        category: string;
        name: { fr?: string; en?: string; ar?: string } | null;
        icon: string | null;
      }>,
      locale,
    );

    return {
      transformed: transformRecord(data, roomItemsMap, locale),
      raw: data,
    };
  } catch (err) {
    console.error("Error fetching experience data:", err);
    return null;
  }
}
