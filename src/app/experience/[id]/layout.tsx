import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { JsonLd } from "@/components/seo/json-ld";
import { buildExperienceSlug } from "@/lib/routing/slugs";

export const revalidate = 1800; // ISR: revalidate every 30 minutes

export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("experiences" as never)
      .select("id, title")
      .eq("status" as never, "published")
      .is("deleted_at" as never, null);

    return ((data ?? []) as Array<{ id: string; title: string }>).map((exp) => ({
      id: buildExperienceSlug({ title: exp.title, id: exp.id }),
    }));
  } catch {
    // Supabase unavailable at build time — fall back to dynamic rendering
    return [];
  }
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchExperienceMeta(
  identifier: string,
): Promise<{ title: string; description: string; image?: string } | null> {
  try {
    const supabase = await createClient();
    const normalized = decodeURIComponent(identifier).trim().toLowerCase();

    // 1. Direct UUID
    if (UUID_REGEX.test(normalized)) {
      const { data } = await supabase
        .from("experiences" as never)
        .select("title, short_description")
        .eq("id" as never, normalized)
        .eq("status" as never, "published")
        .is("deleted_at" as never, null)
        .maybeSingle<{ title: string; short_description: string | null }>();
      if (data) return { title: data.title, description: data.short_description ?? "" };
    }

    // 2. Slug column match
    const { data: bySlug } = await supabase
      .from("experiences" as never)
      .select("title, short_description")
      .eq("slug" as never, normalized)
      .eq("status" as never, "published")
      .is("deleted_at" as never, null)
      .maybeSingle<{ title: string; short_description: string | null }>();
    if (bySlug) return { title: bySlug.title, description: bySlug.short_description ?? "" };

    // 3. Composite slug — last segment is a short ID prefix (first 8 chars of UUID)
    const lastSegment = normalized.split("-").pop() ?? "";
    if (lastSegment.length >= 6) {
      const { data: candidates } = await supabase
        .from("experiences" as never)
        .select("id, title, short_description")
        .like("id" as never, `${lastSegment}%`)
        .eq("status" as never, "published")
        .is("deleted_at" as never, null)
        .limit(5);
      const hit = (candidates as Array<{ id: string; title: string; short_description: string | null }> | null)?.[0];
      if (hit) return { title: hit.title, description: hit.short_description ?? "" };
    }

    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const meta = await fetchExperienceMeta(id);

  if (!meta) {
    return {
      title: "Expérience de voyage — Okeyo Travel",
      description: "Découvrez cette expérience de voyage unique sur Okeyo Travel.",
    };
  }

  return {
    title: `${meta.title} — Okeyo Travel`,
    description:
      meta.description ||
      `Découvrez l'expérience "${meta.title}" sur Okeyo Travel.`,
    openGraph: {
      title: `${meta.title} — Okeyo Travel`,
      description: meta.description || undefined,
      url: `${SITE_URL}/experience/${id}`,
    },
  };
}

export default async function ExperienceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meta = await fetchExperienceMeta(id);
  const experienceUrl = `${SITE_URL}/experience/${id}`;

  return (
    <>
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Accueil",
                item: SITE_URL,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Explorer",
                item: `${SITE_URL}/explore`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: meta?.title ?? "Expérience",
                item: experienceUrl,
              },
            ],
          },
          ...(meta
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "TouristAttraction",
                  name: meta.title,
                  description: meta.description || undefined,
                  url: experienceUrl,
                  touristType: "leisure",
                  availableLanguage: "French",
                },
              ]
            : []),
        ]}
      />
      {children}
    </>
  );
}
