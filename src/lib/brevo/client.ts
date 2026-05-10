import { BrevoClient } from "@getbrevo/brevo";

const apiKey = process.env.BREVO_API_KEY;

if (!apiKey) {
  console.warn(
    "[Brevo] BREVO_API_KEY is not set. Brevo features will be disabled.",
  );
}

export const brevo = apiKey ? new BrevoClient({ apiKey }) : null;

export function isBrevoEnabled(): boolean {
  return !!brevo;
}
