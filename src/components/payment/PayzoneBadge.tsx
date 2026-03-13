"use client";

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
  title = "Paiement securise avec Payzone",
  description,
  className,
  titleClassName,
  descriptionClassName,
  imageWrapperClassName,
  imageClassName,
}: PayzoneBadgeProps) {
  return (

          <Image
            src="/payzone.png"
            alt="Payzone secure payment"
            width={962}
            height={120}
           // className={cn("h-auto w-full", imageClassName)}
          />
  );
}
