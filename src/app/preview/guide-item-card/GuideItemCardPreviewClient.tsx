"use client";

import { GuideItemCard } from "@/components/chat/GuideItemCard";
import type { GuideItemChatCardData } from "@/types/guide-items";

interface GuideItemCardPreviewClientProps {
  item: GuideItemChatCardData;
}

export function GuideItemCardPreviewClient({
  item,
}: GuideItemCardPreviewClientProps) {
  return (
    <GuideItemCard
      item={item}
      onSelect={() => console.log("Selected preview item")}
      onShare={() => console.log("Share preview item")}
    />
  );
}
