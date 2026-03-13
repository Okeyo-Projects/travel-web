import type { ReactNode } from "react";

type SupportMarkdownProps = {
  content: string;
  className?: string;
};

function renderInline(text: string) {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const value = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    if (value.startsWith("**")) {
      parts.push(
        <strong key={`${index}-strong`} className="font-semibold text-slate-900">
          {value.slice(2, -2)}
        </strong>,
      );
    } else if (value.startsWith("`")) {
      parts.push(
        <code
          key={`${index}-code`}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-800"
        >
          {value.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = value.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={`${index}-link`}
            href={linkMatch[2]}
            className="font-medium text-[#d12d61] underline underline-offset-4"
          >
            {linkMatch[1]}
          </a>,
        );
      }
    }

    lastIndex = index + value.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function SupportMarkdown({
  content,
  className = "space-y-4 text-sm leading-6 text-slate-600",
}: SupportMarkdownProps) {
  const blocks = content.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className={className}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);

        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={`ul-${blockIndex}`} className="space-y-2 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={`li-${blockIndex}-${lineIndex}`} className="list-disc">
                  {renderInline(line.replace(/^- /, ""))}
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => /^\d+\.\s/.test(line))) {
          return (
            <ol key={`ol-${blockIndex}`} className="space-y-2 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={`oli-${blockIndex}-${lineIndex}`} className="list-decimal">
                  {renderInline(line.replace(/^\d+\.\s/, ""))}
                </li>
              ))}
            </ol>
          );
        }

        return <p key={`p-${blockIndex}`}>{renderInline(lines.join(" "))}</p>;
      })}
    </div>
  );
}
