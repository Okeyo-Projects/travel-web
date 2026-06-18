"use client";

import { MapPin, Star } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AppLocale } from "@/lib/i18n";
import { getLocalizedI18nValue } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { GuideItemSearchRow } from "@/types/guide-items";
import { getImageUrl, IMAGE_BLUR_DATA_URL } from "@/utils/functions";

interface GuideItemCardProps {
  item: GuideItemSearchRow;
  locale: AppLocale;
  cityName?: string | null;
  showScores?: boolean;
  className?: string;
}

export function GuideItemCard({
  item,
  locale,
  cityName,
  showScores,
  className,
}: GuideItemCardProps) {
  const title = getLocalizedI18nValue(item.title_i18n, locale);
  const summary = getLocalizedI18nValue(item.summary_i18n, locale);
  const imageUrl = item.hero_image_url
    ? getImageUrl(item.hero_image_url)
    : null;
  const displayCity = cityName ?? item.city_slug;

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            placeholder="blur"
            blurDataURL={IMAGE_BLUR_DATA_URL}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
            {title || "Guide"}
          </div>
        )}
        {item.verified && (
          <Badge
            variant="default"
            className="absolute top-3 right-3 bg-primary text-primary-foreground"
          >
            Vérifié
          </Badge>
        )}
      </div>

      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-2">
            {title}
          </h3>
          {item.rating_avg ? (
            <div className="flex items-center gap-1 shrink-0 text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">
                {Number(item.rating_avg).toFixed(1)}
              </span>
            </div>
          ) : null}
        </div>

        {summary ? (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {summary}
          </p>
        ) : null}

        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{displayCity}</span>
        </div>

        {item.price_range ? (
          <p className="text-sm font-medium">
            {item.price_range} {item.currency}
          </p>
        ) : null}

        {item.tags && item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {showScores ? (
          <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
            {item.relevance_score ? (
              <p>Relevance: {item.relevance_score.toFixed(3)}</p>
            ) : null}
            {item.semantic_score ? (
              <p>Semantic: {item.semantic_score.toFixed(3)}</p>
            ) : null}
            {item.text_rank ? (
              <p>Text rank: {item.text_rank.toFixed(3)}</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
