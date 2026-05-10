#!/usr/bin/env node
/**
 * Trigger all Brevo custom events for a given email.
 * Usage:
 *   BREVO_API_KEY=xxx node scripts/trigger-brevo-events.mjs user@example.com
 *   BREVO_API_KEY=xxx node scripts/trigger-brevo-events.mjs user@example.com --all
 *   BREVO_API_KEY=xxx node scripts/trigger-brevo-events.mjs user@example.com user_signed_up ai_conversation_started
 */

const API_KEY = process.env.BREVO_API_KEY;
const BASE_URL = "https://api.brevo.com/v3/events";

const ALL_EVENTS = [
  {
    name: "user_signed_up",
    properties: { source: "test_script", note: "manual trigger" },
  },
  {
    name: "ai_conversation_started",
    properties: { source: "test_script", context: "booking_chat" },
  },
  {
    name: "ai_experiences_listed",
    properties: { source: "test_script", tool_name: "searchExperiences" },
  },
  {
    name: "page_explore_viewed",
    properties: { source: "test_script", path: "/explore" },
  },
  {
    name: "experience_detail_viewed",
    properties: {
      source: "test_script",
      experience_id: "test-exp-123",
      experience_slug: "test-experience",
    },
  },
];

function usage() {
  console.log(`
Usage:
  BREVO_API_KEY=xxx node scripts/trigger-brevo-events.mjs <email> [event_names...]
  BREVO_API_KEY=xxx node scripts/trigger-brevo-events.mjs <email> --all

Available events:
${ALL_EVENTS.map((e) => `  - ${e.name}`).join("\n")}

Examples:
  # Trigger ALL events at once
  BREVO_API_KEY=xxx node scripts/trigger-brevo-events.mjs user@example.com --all

  # Trigger specific events
  BREVO_API_KEY=xxx node scripts/trigger-brevo-events.mjs user@example.com user_signed_up page_explore_viewed
`);
  process.exit(1);
}

async function createEvent(email, eventName, properties) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": API_KEY,
    },
    body: JSON.stringify({
      event_name: eventName,
      identifiers: { email_id: email },
      event_properties: properties,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  // Brevo returns 204 No Content on success for this endpoint
  return res.status;
}

async function main() {
  if (!API_KEY) {
    console.error("❌ Error: BREVO_API_KEY environment variable is required");
    usage();
  }

  const [email, ...args] = process.argv.slice(2);

  if (!email || !email.includes("@")) {
    console.error("❌ Error: Please provide a valid email address");
    usage();
  }

  let eventsToTrigger = [];

  if (args.includes("--all") || args.length === 0) {
    eventsToTrigger = ALL_EVENTS;
    console.log(`🔔 Will trigger ALL ${ALL_EVENTS.length} events for: ${email}\n`);
  } else {
    for (const arg of args) {
      const found = ALL_EVENTS.find((e) => e.name === arg);
      if (!found) {
        console.error(`❌ Unknown event: "${arg}"`);
        console.error(`Available: ${ALL_EVENTS.map((e) => e.name).join(", ")}`);
        process.exit(1);
      }
      eventsToTrigger.push(found);
    }
    console.log(
      `🔔 Will trigger ${eventsToTrigger.length} event(s) for: ${email}\n`
    );
  }

  let success = 0;
  let failed = 0;

  for (const event of eventsToTrigger) {
    process.stdout.write(`  → ${event.name} ... `);
    try {
      const status = await createEvent(email, event.name, event.properties);
      console.log(`✅ (${status})`);
      success++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n📊 Done: ${success} succeeded, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
