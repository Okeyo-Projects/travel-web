"use client";

import { useSiteI18n } from "@/components/site/site-i18n";
import { cn } from "@/lib/utils";
import Image from "next/image";

type PayzoneBadgeProps = {
  title?: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  imageWrapperClassName?: string;
  imageClassName?: string;
  isBlurBackground?: boolean;
};

export function PayzoneBadge({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
  imageWrapperClassName,
  imageClassName,
  isBlurBackground = false,
}: PayzoneBadgeProps) {
  const { t } = useSiteI18n();
  const resolvedTitle = title ?? t("payment.payzone.title");
  const resolvedDescription =
    description ?? t("payment.payzone.description");

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4",
        isBlurBackground ? "backdrop-blur-sm bg-white/30" : "bg-card",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* {resolvedTitle || resolvedDescription ? (
          <div className="space-y-1.5">
            {resolvedTitle ? (
              <p
                className={cn(
                  "text-sm font-semibold text-card-foreground",
                  titleClassName,
                )}
              >
                {resolvedTitle}
              </p>
            ) : null}
            {resolvedDescription ? (
              <p
                className={cn(
                  "text-xs leading-5 text-muted-foreground",
                  descriptionClassName,
                )}
              >
                {resolvedDescription}
              </p>
            ) : null}
          </div>
        ) : null} */}

        <div
          className={cn("w-full min-w-[320px] shrink-0", imageWrapperClassName)}
        >
          <Image
            src="/payzone.png"
            alt={t("payment.payzone.imageAlt")}
            width={962}
            height={120}
            className={cn("h-auto w-full", imageClassName)}
          />
        </div>
      </div>
    </div>
  );
}
