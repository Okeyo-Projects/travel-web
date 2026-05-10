import { BrevoClient } from "@getbrevo/brevo";

// Client-side uses NEXT_PUBLIC_ prefix; server-side falls back to BREVO_API_KEY
const apiKey = process.env.NEXT_PUBLIC_BREVO_API_KEY || process.env.BREVO_API_KEY;

if (!apiKey) {
  console.warn(
    "[Brevo] BREVO_API_KEY (or NEXT_PUBLIC_BREVO_API_KEY) is not set. Brevo features will be disabled.",
  );
}

export const brevo = apiKey ? new BrevoClient({ apiKey }) : null;

export function isBrevoEnabled(): boolean {
  return !!brevo;
}
