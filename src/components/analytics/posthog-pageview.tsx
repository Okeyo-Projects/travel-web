"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams?.toString();
    const currentUrl = query ? `${pathname}?${query}` : pathname;

    captureEvent(ANALYTICS_EVENT.PAGE_VIEWED, {
      $current_url: currentUrl,
      pathname,
    });
  }, [pathname, searchParams]);

  return null;
}
