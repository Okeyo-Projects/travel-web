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

export function slugify(value: string): string {
  return normalizeSlugInput(value);
}

export function getExperienceIdSegment(experienceId: string): string {
  const firstSegment = experienceId.split("-")[0];
  return firstSegment || experienceId.slice(0, 8);
}

export function buildExperienceSlug(input: {
  title: string;
  id: string;
  slug?: string | null;
}): string {
  const titlePart = slugify(input.title) || "experience";
  const idPart = getExperienceIdSegment(input.id);
  return `${titlePart}-${idPart}`;
}

export function buildCategorySlug(input: {
  title?: LocalizedTitle | null;
  slug?: string | null;
}): string {
  const title = resolveTitle(input.title);
  return slugify(title) || "category";
}

export function categoryMatchesSlug(
  category: { title?: LocalizedTitle | null; slug?: string | null },
  slug: string,
): boolean {
  return buildCategorySlug(category) === slugify(slug);
}
