"use client";

import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";

interface QuickRepliesProps {
  question?: string;
  options: string[];
  allowFreeText?: boolean;
  disabled?: boolean;
  onSelect?: (option: string) => void;
}

export function QuickReplies({
  question,
  options,
  allowFreeText = true,
  disabled = false,
  onSelect,
}: QuickRepliesProps) {
  const { t, dir } = useSiteI18n();
  if (options.length === 0) return null;

  return (
    <div
      dir={dir}
      className="rounded-xl border bg-muted/30 p-3 sm:p-4 space-y-3"
    >
      {question ? (
        <p dir="auto" className="text-sm font-medium [text-align:start]">
          {question}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant="outline"
            size="sm"
            dir="auto"
            disabled={disabled || !onSelect}
            onClick={() => onSelect?.(option)}
            className="h-auto whitespace-normal [text-align:start] leading-snug py-1.5 rounded-2xl"
          >
            {option}
          </Button>
        ))}
      </div>

      {allowFreeText && (
        <p className="text-xs text-muted-foreground [text-align:start]">
          {t("chat.quickReplies.freeText")}
        </p>
      )}
    </div>
  );
}
