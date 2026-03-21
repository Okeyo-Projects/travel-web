"use client";

import { useReportWebVitals } from "next/web-vitals";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { isAnalyticsEnabled } from "@/lib/analytics/posthog";

// Thresholds per https://web.dev/vitals/
const RATINGS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

function getRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const thresholds = RATINGS[name];
  if (!thresholds) return "good";
  if (value <= thresholds[0]) return "good";
  if (value <= thresholds[1]) return "needs-improvement";
  return "poor";
}

export function WebVitalsReporter() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    if (!isAnalyticsEnabled()) return;
    posthog.capture("web_vitals", {
      metric_name: metric.name,
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      rating: getRating(metric.name, metric.value),
      path: pathname,
    });
  });

  return null;
}
