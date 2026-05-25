import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";
const PRIVATE_PATHS = [
  "/api/",
  "/admin/",
  "/agent/",
  "/host/",
  "/bookings/",
  "/profile/",
  "/notifications/",
  "/settings/",
  "/chat/",
] satisfies string[];
const GENERIC_CRAWLER_EXCLUSIONS = [
  ...PRIVATE_PATHS,
  "/*?*",
  "/*&*",
  "/*.json$",
  "/*/print/",
  "/*/amp/",
] satisfies string[];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: GENERIC_CRAWLER_EXCLUSIONS,
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended"],
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
