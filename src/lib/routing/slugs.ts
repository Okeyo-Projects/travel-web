import { type AppLocale, DEFAULT_LOCALE } from "@/lib/i18n";

type LocalizedTitle =
  | string
  | {
      fr?: string | null;
      en?: string | null;
      ar?: string | null;
    };

function normalizeSlugInput(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function resolveTitle(title: LocalizedTitle | null | undefined): string {
  if (!title) {
    return "";
  }

  if (typeof title === "string") {
    return title;
  }

  return title.fr ?? title.en ?? title.ar ?? "";
}

export function resolveLocalizedTitle(
  title: LocalizedTitle | null | undefined,
  locale: AppLocale,
  fallback: AppLocale = DEFAULT_LOCALE,
): string {
  if (!title) {
    return "";
  }

  if (typeof title === "string") {
    return title;
  }

  return (
    title[locale] ?? title[fallback] ?? title.fr ?? title.en ?? title.ar ?? ""
  );
}

export function slugify(value: string): string {
  return normalizeSlugInput(value);
}

export function getExperienceIdSegment(experienceId: string): string {
  const firstSegment = experienceId.split("-")[0];
  return firstSegment || experienceId.slice(0, 8);
}

export function getExperienceIdSegmentFromIdentifier(
  identifier: string,
): string | null {
  const match = identifier
    .trim()
    .toLowerCase()
    .match(/(?:^|-)([0-9a-f]{8})$/);

  return match?.[1] ?? null;
}

export function buildExperienceSlug(input: {
  title: string;
  id: string;
  slug?: string | null;
}): string {
  if (input.slug)
    return (
      slugify(input.slug) ||
      `${slugify(input.title) || "experience"}-${getExperienceIdSegment(input.id)}`
    );
  const titlePart = slugify(input.title) || "experience";
  const idPart = getExperienceIdSegment(input.id);
  return `${titlePart}-${idPart}`;
}

export function buildExperienceHref(input: {
  title: string;
  id: string;
  slug?: string | null;
  region?: string | null;
  city: string;
}): string {
  const regionSlug = input.region ? slugify(input.region) : slugify(input.city);
  const citySlug = slugify(input.city);
  const expSlug = buildExperienceSlug({
    title: input.title,
    id: input.id,
    slug: input.slug,
  });
  return `/hebergement/${regionSlug}/${citySlug}/${expSlug}`;
}

export function buildCategorySlug(input: {
  title?: LocalizedTitle | null;
  slug?: string | null;
}): string {
  if (input.slug) {
    return slugify(input.slug) || "category";
  }

  const title = resolveTitle(input.title);
  return slugify(title) || "category";
}

export function categoryMatchesSlug(
  category: {
    id?: string | null;
    title?: LocalizedTitle | null;
    slug?: string | null;
  },
  slug: string,
): boolean {
  const normalizedSlug = slugify(slug);
  if (!normalizedSlug) {
    return false;
  }

  if (category.id && category.id === slug) {
    return true;
  }

  if (category.slug && slugify(category.slug) === normalizedSlug) {
    return true;
  }

  if (typeof category.title === "string") {
    return slugify(category.title) === normalizedSlug;
  }

  if (!category.title) {
    return false;
  }

  return [category.title.fr, category.title.en, category.title.ar].some(
    (value) => Boolean(value) && slugify(value as string) === normalizedSlug,
  );
}
