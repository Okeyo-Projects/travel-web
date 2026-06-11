"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { localizeHref } from "@/lib/routing/locale-path";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/translations-provider";

interface LegalNoticeProps {
  variant?:
    | "termsAndPrivacy"
    | "dataProcessing"
    | "bookingDataProcessing"
    | "rights";
  requireCheckbox?: boolean;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  checkboxError?: string;
  className?: string;
  textClassName?: string;
  onLinkClick?: () => void;
}

export function LegalNotice({
  variant = "termsAndPrivacy",
  requireCheckbox,
  checkboxChecked,
  onCheckboxChange,
  checkboxError,
  className,
  textClassName,
  onLinkClick,
}: LegalNoticeProps) {
  const t = useT();
  const pathname = usePathname();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    // Temporarily apply clamp to measure overflow
    const wasExpanded = isExpanded;
    if (wasExpanded) {
      el.classList.add("line-clamp-2");
      el.classList.remove("line-clamp-none");
    }
    setIsOverflowing(el.scrollHeight > el.clientHeight);
    if (wasExpanded) {
      el.classList.remove("line-clamp-2");
      el.classList.add("line-clamp-none");
    }
  }, [isExpanded]);

  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  const content =
    variant === "dataProcessing" ? (
      t("authModal.dataProcessingNotice")
    ) : variant === "bookingDataProcessing" ? (
      t("authModal.bookingDataProcessingNotice")
    ) : variant === "rights" ? (
      t("authModal.rightsNotice")
    ) : (
      <>
        {t("authModal.legalPrefix")}{" "}
        <Link
          href={localizeHref("/terms", pathname)}
          className="font-medium text-foreground hover:text-primary underline underline-offset-2"
          onClick={() => onLinkClick?.()}
        >
          {t("authModal.legalTerms")}
        </Link>{" "}
        {t("authModal.legalAnd")}{" "}
        <Link
          href={localizeHref("/privacy", pathname)}
          className="font-medium text-foreground hover:text-primary underline underline-offset-2"
          onClick={() => onLinkClick?.()}
        >
          {t("authModal.legalPrivacy")}
        </Link>
        .
      </>
    );

  if (requireCheckbox) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-start gap-2">
          <Checkbox
            id="legal-checkbox"
            checked={checkboxChecked}
            onCheckedChange={(checked) => onCheckboxChange?.(checked === true)}
            aria-invalid={!!checkboxError}
            className="mt-0.5 shrink-0"
          />
          <label
            htmlFor="legal-checkbox"
            className={cn(
              "cursor-pointer text-muted-foreground",
              textClassName,
            )}
          >
            {content}
          </label>
        </div>
        {checkboxError ? (
          <p className="text-xs text-destructive">{checkboxError}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <p
        ref={textRef}
        className={cn(
          "text-muted-foreground transition-all",
          !isExpanded && "line-clamp-2",
          textClassName,
        )}
      >
        {content}
      </p>
      {isOverflowing && (
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          className="text-sm font-medium text-foreground hover:text-primary"
        >
          {isExpanded ? t("authModal.legalLess") : t("authModal.legalMore")}
        </button>
      )}
    </div>
  );
}
