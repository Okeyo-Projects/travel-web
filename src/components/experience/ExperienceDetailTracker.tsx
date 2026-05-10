"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { trackBrevoEvent } from "@/lib/brevo/events";

export function ExperienceDetailTracker({
  experienceId,
  experienceSlug,
}: {
  experienceId: string;
  experienceSlug: string | null;
}) {
  const { user } = useAuth();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    if (user?.email) {
      void trackBrevoEvent(user.email, "experience_detail_viewed", {
        experience_id: experienceId,
        experience_slug: experienceSlug || "",
      });
    }
  }, [user?.email, experienceId, experienceSlug]);

  return null;
}
