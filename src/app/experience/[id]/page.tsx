import { createClient } from "@/lib/supabase/server";
import { buildExperienceSlug } from "@/lib/routing/slugs";
import {
  SELECT_EXPERIENCE_DETAIL,
  transformRecord,
  type ExperienceDetailResponse,
} from "@/hooks/use-experience-detail";
import type { SupabaseExperienceRecord } from "@/types/experience-detail";
import { ExperienceDetailClient } from "./ExperienceDetailClient";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchInitialData(
  identifier: string,
): Promise<ExperienceDetailResponse> {
  try {
    const supabase = await createClient();
    const normalized = decodeURIComponent(identifier).trim().toLowerCase();

    let experienceId: string | null = null;

    // 1. Direct UUID
    if (UUID_REGEX.test(normalized)) {
      experienceId = normalized;
    }

    // 2. Slug column match
    if (!experienceId) {
      const { data } = await supabase
        .from("experiences" as never)
        .select("id")
        .eq("slug" as never, normalized)
        .eq("status" as never, "published")
        .is("deleted_at" as never, null)
        .maybeSingle<{ id: string }>();
      if (data?.id) experienceId = data.id;
    }

    // 3. Composite slug — last segment is a short ID prefix (first 8 chars of UUID)
    if (!experienceId) {
      const lastSegment = normalized.split("-").pop() ?? "";
      if (lastSegment.length >= 6) {
        const { data: candidates } = await supabase
          .from("experiences" as never)
          .select("id, title")
          .like("id" as never, `${lastSegment}%`)
          .eq("status" as never, "published")
          .is("deleted_at" as never, null)
          .limit(5);
        const match = (
          candidates as Array<{ id: string; title: string }> | null
        )?.find(
          (c) =>
            buildExperienceSlug({ title: c.title, id: c.id }) === normalized,
        );
        if (match) experienceId = match.id;
      }
    }

    if (!experienceId) return null;

    const { data, error } = await supabase
      .from("experiences" as never)
      .select(SELECT_EXPERIENCE_DETAIL)
      .eq("id" as never, experienceId)
      .maybeSingle<SupabaseExperienceRecord>();

    if (error || !data) return null;

    return { transformed: transformRecord(data), raw: data };
  } catch {
    return null;
  }
}

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialData = await fetchInitialData(id);

  return (
    <ExperienceDetailClient
      experienceId={id}
      initialData={initialData ?? undefined}
    />
  );
}
