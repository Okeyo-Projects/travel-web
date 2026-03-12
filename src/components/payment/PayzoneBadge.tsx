"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type PayzoneBadgeProps = {
  title?: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  imageWrapperClassName?: string;
  imageClassName?: string;
};

export function PayzoneBadge({
  title = "Paiement securise avec Payzone",
  description,
  className,
  titleClassName,
  descriptionClassName,
  imageWrapperClassName,
  imageClassName,
}: PayzoneBadgeProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-muted/30 p-4",
        className,
      )}
    >
      <div className="space-y-3">
        {title ? (
          <p className={cn("text-sm font-medium leading-snug", titleClassName)}>
            {title}
          </p>
        ) : null}
        <div
          className={cn(
            "rounded-xl border border-black/5 bg-white p-3 shadow-sm",
            imageWrapperClassName,
          )}
        >
          <Image
            src="/payzone.png"
            alt="Payzone secure payment"
            width={1162}
            height={120}
            className={cn("h-auto w-full", imageClassName)}
          />
        </div>
        {description ? (
          <p
            className={cn(
              "text-xs text-muted-foreground",
              descriptionClassName,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
