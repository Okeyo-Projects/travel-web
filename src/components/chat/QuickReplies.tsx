"use client";

import { Button } from "@/components/ui/button";

interface QuickRepliesProps {
  options: string[];
  allowFreeText?: boolean;
  disabled?: boolean;
  onSelect?: (option: string) => void;
}

export function QuickReplies({
  options,
  allowFreeText = true,
  disabled = false,
  onSelect,
}: QuickRepliesProps) {
  if (options.length === 0) return null;

  return (
    <div className="rounded-xl border bg-muted/30 p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !onSelect}
            onClick={() => onSelect?.(option)}
            className="h-auto whitespace-normal text-left leading-snug py-1.5 rounded-2xl"
          >
            {option}
          </Button>
        ))}
      </div>

      {allowFreeText && (
        <p className="text-xs text-muted-foreground">
          Vous pouvez aussi répondre librement.
        </p>
      )}
    </div>
  );
}
