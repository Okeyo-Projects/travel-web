"use client";

import { useSiteI18n } from "@/components/site/site-i18n";
import type { GuideItemChatCardData } from "@/types/guide-items";
import { GuideItemCard } from "./GuideItemCard";

export interface GuideItemCardsGridProps {
  items: GuideItemChatCardData[];
  onSelectItem?: (itemId: string) => void;
  onShareItem?: (itemId: string) => void;
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
        {items.map((item) => (
          <GuideItemCard
            key={item.id}
            item={item}
            onSelect={onSelectItem ? () => onSelectItem(item.id) : undefined}
            onShare={onShareItem ? () => onShareItem(item.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
