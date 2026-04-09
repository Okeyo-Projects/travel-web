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
};

export function PayzoneBadge({
 // title = "Paiement securisé avec Payzone",
 title,
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
        "rounded-2xl border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {title || description ? (
          <div className="space-y-1.5">
            {title ? (
              <p
                className={cn(
                  "text-sm font-semibold text-card-foreground",
                  titleClassName,
                )}
              >
                {title}
              </p>
            ) : null}
            {description ? (
              <p
                className={cn(
                  "text-xs leading-5 text-muted-foreground",
                  descriptionClassName,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={cn("w-full min-w-[320px] shrink-0", imageWrapperClassName)}>
          <Image
            src="/payzone.png"
            alt="Paiement sécurisé par Payzone - Cartes acceptées: Visa, Mastercard, CMI"
            width={962}
            height={120}
            className={cn("h-auto w-full", imageClassName)}
          />
        </div>
      </div>
    </div>
  );
}
