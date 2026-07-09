"use client";

import { useSiteI18n } from "@/components/site/site-i18n";
import type { GuideItemChatCardData } from "@/types/guide-items";
import { GuideItemCard } from "./GuideItemCard";

export interface GuideItemCardsGridProps {
  items: GuideItemChatCardData[];
  onSelectItem?: (itemId: string) => void;
  onShareItem?: (itemId: string) => void;
}

function getItemContext(item: GuideItemChatCardData): string | null {
  const details = [
    item.summary,
    item.price_range ? `${item.price_range} ${item.currency}` : null,
    item.rating_avg != null ? `${item.rating_avg.toFixed(1)}/5` : null,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : null))
    .filter((value): value is string => Boolean(value));

  return details.length > 0 ? details.join(" • ") : null;
}

export function GuideItemCardsGrid({
  items,
  onSelectItem,
  onShareItem,
}: GuideItemCardsGridProps) {
  const { t } = useSiteI18n();

  if (!items || items.length === 0) {
    return null;
  }

  const verifiedCount = items.filter((item) => item.verified).length;
  const isSingle = items.length === 1;

  return (
    <div className="space-y-4">
      {!isSingle && (
        <div className="text-sm text-muted-foreground">
          {items.length === 1
            ? t("chat.results.count.one", { count: items.length })
            : t("chat.results.count.other", { count: items.length })}
          {verifiedCount > 0 && (
            <span className="inline-flex gap-1 text-primary font-medium [padding-inline-start:0.5rem]">
              ({t("chat.guideItemCard.verifiedCount", { count: verifiedCount })}
              )
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {items.map((item) => {
          const itemContext = getItemContext(item);

          return (
            <div key={item.id} className="space-y-3">
              {itemContext ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {item.title}
                  </span>{" "}
                  {itemContext}
                </p>
              ) : null}

              <GuideItemCard
                item={item}
                onSelect={
                  onSelectItem ? () => onSelectItem(item.id) : undefined
                }
                onShare={onShareItem ? () => onShareItem(item.id) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
