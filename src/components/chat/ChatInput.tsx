"use client";

import { MapPin, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatContext } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";

const TYPING_SPEED = 30;
const DELETING_SPEED = 15;
const PAUSE_AFTER_TYPE = 2500;
const PAUSE_AFTER_DELETE = 400;

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onSubmitMessage: () => void | Promise<void>;
  onInputFocus?: () => void;
  isLoading: boolean;
  queuedMessage?: string | null;
  onRequestLocation: () => void;
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  onSubmitMessage,
  onInputFocus,
  isLoading,
  queuedMessage,
  onRequestLocation,
}: ChatInputProps) {
  const { t, dir } = useSiteI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { userLocation } = useChatContext();
  const [isFocused, setIsFocused] = useState(false);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("");
  const [isDeletingPlaceholder, setIsDeletingPlaceholder] = useState(false);
  const placeholderText = t("chat.input.placeholder");
  const shouldAnimatePlaceholder = !input.trim() && !isFocused;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  });

  useEffect(() => {
    if (shouldAnimatePlaceholder) {
      setAnimatedPlaceholder("");
      setIsDeletingPlaceholder(false);
      return;
    }

    setAnimatedPlaceholder(placeholderText);
    setIsDeletingPlaceholder(false);
  }, [placeholderText, shouldAnimatePlaceholder]);

  useEffect(() => {
    if (!shouldAnimatePlaceholder) {
      return;
    }

    if (!isDeletingPlaceholder && animatedPlaceholder === placeholderText) {
      const timeout = setTimeout(
        () => setIsDeletingPlaceholder(true),
        PAUSE_AFTER_TYPE,
      );
      return () => clearTimeout(timeout);
    }

    if (isDeletingPlaceholder && animatedPlaceholder === "") {
      const timeout = setTimeout(
        () => setIsDeletingPlaceholder(false),
        PAUSE_AFTER_DELETE,
      );
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(
      () => {
        setAnimatedPlaceholder(
          isDeletingPlaceholder
            ? placeholderText.slice(0, animatedPlaceholder.length - 1)
            : placeholderText.slice(0, animatedPlaceholder.length + 1),
        );
      },
      isDeletingPlaceholder ? DELETING_SPEED : TYPING_SPEED,
    );

    return () => clearTimeout(timeout);
  }, [
    animatedPlaceholder,
    isDeletingPlaceholder,
    placeholderText,
    shouldAnimatePlaceholder,
  ]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!e.repeat && input.trim()) {
        void onSubmitMessage();
      }
    }
  };

  return (
    <div
      dir={dir}
      className="w-full max-w-3xl mx-auto px-2 py-2 sm:px-3 sm:py-4"
    >
      <div
        className={cn(
          "relative flex flex-col bg-background border rounded-2xl shadow-sm transition-all duration-200",
          isFocused
            ? "border-primary/50 ring-2 ring-primary/10 shadow-md"
            : "border-border",
        )}
      >
        <form onSubmit={handleSubmit} className="flex flex-col w-full">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            dir="auto"
            onFocus={() => {
              setIsFocused(true);
              onInputFocus?.();
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={animatedPlaceholder}
            className="min-h-[50px] sm:min-h-[56px] max-h-[140px] sm:max-h-[200px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3.5 sm:px-4 py-2.5 sm:py-3 text-[15px] sm:text-base [text-align:start]"
            rows={1}
          />

          <div className="flex items-center justify-between px-2 sm:px-2.5 pb-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-full",
                  userLocation ? "text-emerald-500" : "text-muted-foreground",
                )}
                onClick={onRequestLocation}
                title={
                  userLocation
                    ? t("chat.input.locationEnabled")
                    : t("chat.input.shareLocation")
                }
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className={cn(
                "h-9 w-9 rounded-full transition-all duration-200",
                input.trim()
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
      {queuedMessage ? (
        <p className="mt-2 text-center text-[11px] text-primary sm:text-xs">
          {t("chat.input.queued")}
        </p>
      ) : isLoading ? (
        <p className="mt-2 text-center text-[11px] text-muted-foreground sm:text-xs">
          {t("chat.input.responding")}
        </p>
      ) : null}
      <p className="text-[11px] sm:text-xs text-center text-muted-foreground mt-2">
        {t("chat.input.disclaimer")}
      </p>
    </div>
  );
}
