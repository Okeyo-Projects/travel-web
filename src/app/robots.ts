import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/agent/",
          "/host/",
          "/bookings/",
          "/profile/",
          "/notifications/",
          "/settings/",
          "/chat/",
        ],
      },
      // Allow AI crawlers — good for AI search readiness
      {
        userAgent: ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended"],
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/agent/",
          "/host/",
          "/bookings/",
          "/profile/",
          "/notifications/",
          "/settings/",
          "/chat/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
