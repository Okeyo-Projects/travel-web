"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickRepliesProps {
  question: string;
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
  if (!question || options.length === 0) return null;

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
        <p className="text-sm text-foreground">{question}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !onSelect}
            onClick={() => onSelect?.(option)}
            className="rounded-full"
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
