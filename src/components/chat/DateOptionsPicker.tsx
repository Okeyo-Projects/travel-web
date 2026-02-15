"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DateOptionItem {
  id: string;
  label: string;
  reply_text: string;
  from_date?: string;
  to_date?: string;
  nights?: number;
}

interface DateOptionsPickerProps {
  question: string;
  options: DateOptionItem[];
  allowFreeText?: boolean;
  disabled?: boolean;
  onSelect?: (replyText: string) => void;
}

export function DateOptionsPicker({
  question,
  options,
  allowFreeText = true,
  disabled = false,
  onSelect,
}: DateOptionsPickerProps) {
  if (!question || options.length === 0) return null;

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <CalendarDays className="h-4 w-4 text-primary mt-0.5" />
        <p className="text-sm text-foreground">{question}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={`${option.id}:${option.label}`}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !onSelect}
            onClick={() => onSelect?.(option.reply_text)}
            className="rounded-full"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {allowFreeText && (
        <p className="text-xs text-muted-foreground">
          Vous pouvez aussi écrire vos dates exactes.
        </p>
      )}
    </div>
  );
}
