"use client";

import { useEffect } from "react";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";

interface CategoryAnalyticsProps {
  categoryId: string;
  categorySlug: string;
}

export function CategoryAnalytics({ categoryId, categorySlug }: CategoryAnalyticsProps) {
  useEffect(() => {
    captureEvent(ANALYTICS_EVENT.CATEGORY_VIEWED, {
      category_slug: categorySlug,
      category_id: categoryId,
    });
  }, [categoryId, categorySlug]);

  return null;
}
