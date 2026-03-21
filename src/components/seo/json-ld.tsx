interface JsonLdProps {
  schema: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Renders one or more JSON-LD schemas as a <script type="application/ld+json"> tag.
 * Use inside a Server Component (layout or page) — never in a Client Component.
 */
export function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized from a trusted server-side object, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
