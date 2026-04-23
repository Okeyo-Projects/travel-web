import sanitizeHtml from "sanitize-html";

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizePlainTextToHtml = (value: string) =>
  value
    .trim()
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

export function sanitizeExperienceRichTextHtml(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const source = HTML_TAG_PATTERN.test(trimmed)
    ? trimmed
    : normalizePlainTextToHtml(trimmed);

  return sanitizeHtml(source, {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "code",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "strong",
      "u",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "rel", "target"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attribs) => {
        const href = typeof attribs.href === "string" ? attribs.href : "";
        const sanitizedAttribs: Record<string, string> = href
          ? {
              href,
              rel: "noopener noreferrer nofollow",
              target: "_blank",
            }
          : {};

        return {
          tagName: "a",
          attribs: sanitizedAttribs,
        };
      },
      b: sanitizeHtml.simpleTransform("strong", {}),
      i: sanitizeHtml.simpleTransform("em", {}),
      strike: sanitizeHtml.simpleTransform("s", {}),
    },
  });
}

export function prepareExperienceRichText(value: string) {
  const html = sanitizeExperienceRichTextHtml(value);
  const plainText = sanitizeHtml(html, {
    allowedAttributes: {},
    allowedTags: [],
  })
    .replace(/\s+/g, " ")
    .trim();

  return {
    html,
    plainText,
  };
}
