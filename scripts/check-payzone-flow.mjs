import fs from "node:fs";
import path from "node:path";

const repoDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
const bookingPagePath = path.join(
  repoDir,
  "src",
  "app",
  "bookings",
  "[bookingId]",
  "page.tsx",
);
const payzoneLibPath = path.join(repoDir, "src", "lib", "payzone.ts");
const createSessionPath = path.join(
  repoDir,
  "supabase",
  "functions",
  "create-payzone-session",
  "index.ts",
);
const packageJsonPath = path.join(repoDir, "package.json");

const results = [];

function addResult(level, message) {
  results.push({ level, message });
  console.log(`[${level}] ${message}`);
}

function pass(message) {
  addResult("PASS", message);
}

function warn(message) {
  addResult("WARN", message);
}

function fail(message) {
  addResult("FAIL", message);
}

function expect(condition, successMessage, failureMessage) {
  if (condition) {
    pass(successMessage);
    return;
  }

  fail(failureMessage);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

async function runLiveSessionCheck() {
  const bookingId = process.env.PAYZONE_CHECK_BOOKING_ID;
  const accessToken = process.env.PAYZONE_CHECK_ACCESS_TOKEN;
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!bookingId && !accessToken) {
    warn(
      "Skipping live Payzone session check. Set PAYZONE_CHECK_BOOKING_ID and PAYZONE_CHECK_ACCESS_TOKEN to invoke create-payzone-session.",
    );
    return;
  }

  const missing = [];
  if (!bookingId) missing.push("PAYZONE_CHECK_BOOKING_ID");
  if (!accessToken) missing.push("PAYZONE_CHECK_ACCESS_TOKEN");
  if (!supabaseUrl) missing.push("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) {
    missing.push(
      "SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  if (missing.length > 0) {
    fail(
      `Live Payzone session check requested but missing: ${missing.join(", ")}`,
    );
    return;
  }

  const normalizedSupabaseUrl = new URL(supabaseUrl)
    .toString()
    .replace(/\/$/, "");
  const response = await fetch(
    `${normalizedSupabaseUrl}/functions/v1/create-payzone-session`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingId }),
    },
  );

  const rawBody = await response.text();
  let parsedBody = null;

  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Keep raw body for reporting below.
  }

  expect(
    response.ok,
    `Live create-payzone-session call succeeded for booking ${bookingId}.`,
    `Live create-payzone-session call failed (${response.status}): ${rawBody || response.statusText}`,
  );

  if (!response.ok) {
    return;
  }

  const isValidSession =
    parsedBody &&
    typeof parsedBody.paymentId === "string" &&
    typeof parsedBody.paywallUrl === "string" &&
    typeof parsedBody.payload === "string" &&
    typeof parsedBody.signature === "string";

  expect(
    isValidSession,
    "Live create-payzone-session returned a valid Payzone session shape.",
    "Live create-payzone-session response did not match the expected Payzone session shape.",
  );

  if (!isValidSession) {
    return;
  }

  let payload = null;

  try {
    payload = JSON.parse(parsedBody.payload);
    pass("Live Payzone session payload is valid JSON.");
  } catch (error) {
    fail(`Live Payzone session payload could not be parsed: ${error.message}`);
    return;
  }

  expect(
    payload.orderId === parsedBody.paymentId,
    "Live payload orderId matches the session paymentId.",
    "Live payload orderId does not match the session paymentId.",
  );

  expect(
    typeof payload.successUrl === "string" &&
      payload.successUrl.includes(`/bookings/${bookingId}`) &&
      payload.successUrl.includes("payzoneStatus=success"),
    "Live payload successUrl returns to the booking detail page.",
    "Live payload successUrl does not return to the booking detail page.",
  );

  expect(
    typeof payload.failureUrl === "string" &&
      payload.failureUrl.includes(`/bookings/${bookingId}`) &&
      payload.failureUrl.includes("payzoneStatus=failure"),
    "Live payload failureUrl returns to the booking detail page.",
    "Live payload failureUrl does not return to the booking detail page.",
  );

  expect(
    typeof payload.cancelUrl === "string" &&
      payload.cancelUrl.includes(`/bookings/${bookingId}`) &&
      payload.cancelUrl.includes("payzoneStatus=cancel"),
    "Live payload cancelUrl returns to the booking detail page.",
    "Live payload cancelUrl does not return to the booking detail page.",
  );
}

async function main() {
  const bookingPageSource = read(bookingPagePath);
  const payzoneLibSource = read(payzoneLibPath);
  const createSessionSource = read(createSessionPath);
  const packageJson = JSON.parse(read(packageJsonPath));

  expect(
    packageJson.scripts?.["payzone:check"] ===
      "node scripts/check-payzone-flow.mjs",
    "package.json exposes a payzone:check script.",
    "package.json is missing the payzone:check script.",
  );

  expect(
    payzoneLibSource.includes("isPayzoneSession"),
    "Shared Payzone session validation exists in src/lib/payzone.ts.",
    "Shared Payzone session validation is missing from src/lib/payzone.ts.",
  );

  expect(
    payzoneLibSource.includes("readPayzoneReturnParams"),
    "Shared Payzone return param parsing exists in src/lib/payzone.ts.",
    "Shared Payzone return param parsing is missing from src/lib/payzone.ts.",
  );

  expect(
    createSessionSource.includes("PAYZONE_RETURN_BASE_URL"),
    "create-payzone-session reads PAYZONE_RETURN_BASE_URL.",
    "create-payzone-session is not reading PAYZONE_RETURN_BASE_URL.",
  );

  expect(
    createSessionSource.includes("new URL(") &&
      /`\/bookings\/\$\{bookingId\}`/.test(createSessionSource),
    "create-payzone-session returns users to /bookings/[bookingId].",
    "create-payzone-session is not returning users to /bookings/[bookingId].",
  );

  expect(
    !createSessionSource.includes("https://okeyo.app/payzone/return"),
    "Legacy okeyo.app return URL is no longer hardcoded in create-payzone-session.",
    "Legacy okeyo.app return URL is still hardcoded in create-payzone-session.",
  );

  expect(
    bookingPageSource.includes("useSearchParams"),
    "Booking detail page reads Payzone return query params.",
    "Booking detail page is not reading Payzone return query params.",
  );

  expect(
    bookingPageSource.includes("isPayzoneSession"),
    "Booking detail page validates the Payzone session response.",
    "Booking detail page is not validating the Payzone session response.",
  );

  expect(
    bookingPageSource.includes('window.open("", payzoneWindowName'),
    "Booking detail page opens a checkout window during the user click gesture.",
    "Booking detail page is not pre-opening a checkout window during the click gesture.",
  );

  expect(
    bookingPageSource.includes(
      'openPayzonePaywall(session, payzoneWindow ? payzoneWindowName : "_self")',
    ),
    "Booking detail page falls back to same-tab checkout when the popup cannot be used.",
    "Booking detail page is missing the same-tab checkout fallback.",
  );

  expect(
    bookingPageSource.includes("router.replace(pathname"),
    "Booking detail page clears Payzone return query params after handling them.",
    "Booking detail page is not clearing Payzone return query params after handling them.",
  );

  await runLiveSessionCheck();

  const failureCount = results.filter(
    (result) => result.level === "FAIL",
  ).length;
  const warningCount = results.filter(
    (result) => result.level === "WARN",
  ).length;

  console.log(
    `\nSummary: ${results.length} checks, ${failureCount} failed, ${warningCount} warnings.`,
  );

  if (failureCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[FAIL] payzone:check crashed:", error);
  process.exit(1);
});
