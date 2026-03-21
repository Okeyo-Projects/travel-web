import {
  type Analytics,
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
  setUserProperties,
} from "firebase/analytics";
import { getApp, getApps, initializeApp } from "firebase/app";
import { isBrowserAnalyticsAllowed } from "@/lib/analytics/browser";
import {
  ANALYTICS_EVENT,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
  type AnalyticsUserProperties,
} from "@/lib/analytics/events";

type FirebaseEventParameters = Record<string, unknown>;
type FirebasePrimitiveEventParameters = Record<
  string,
  string | number | boolean
>;

function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  if (!apiKey || !projectId || !messagingSenderId || !appId || !measurementId) {
    return null;
  }

  return {
    apiKey,
    appId,
    authDomain,
    measurementId,
    messagingSenderId,
    projectId,
    storageBucket,
  };
}

let analyticsPromise: Promise<Analytics | null> | null = null;

function sanitizeEventName(event: AnalyticsEventName) {
  if (event === "$pageview") return "page_view";

  return event.replace(/[^a-zA-Z0-9_]/g, "_");
}

function sanitizeEventParameters(
  properties?: AnalyticsEventProperties,
): FirebasePrimitiveEventParameters | undefined {
  if (!properties) return undefined;

  const entries = Object.entries(properties).filter(
    (entry): entry is [string, string | number | boolean] =>
      entry[1] !== null && entry[1] !== undefined,
  );

  if (entries.length === 0) return undefined;

  return Object.fromEntries(
    entries.map(([key, value]) => [key.replace(/[^a-zA-Z0-9_]/g, "_"), value]),
  );
}

function getStringProperty(
  properties: AnalyticsEventProperties | undefined,
  key: string,
) {
  const value = properties?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumberProperty(
  properties: AnalyticsEventProperties | undefined,
  key: string,
) {
  const value = properties?.[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getCurrencyProperty(properties?: AnalyticsEventProperties) {
  const currency = getStringProperty(properties, "currency");
  return currency?.toUpperCase();
}

function getValueFromCents(
  properties: AnalyticsEventProperties | undefined,
  key = "total_price",
) {
  const cents = getNumberProperty(properties, key);
  return typeof cents === "number" ? cents / 100 : undefined;
}

function buildItemParameters(properties?: AnalyticsEventProperties) {
  const itemId = getStringProperty(properties, "experience_id");
  if (!itemId) return undefined;

  return [
    {
      item_category: getStringProperty(properties, "experience_type"),
      item_id: itemId,
      item_name: getStringProperty(properties, "experience_title"),
    },
  ];
}

function compactParameters(parameters: FirebaseEventParameters) {
  const entries = Object.entries(parameters).filter(
    ([, value]) => value !== null && value !== undefined,
  );

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

function buildRecommendedFirebaseEvents(
  event: AnalyticsEventName,
  properties?: AnalyticsEventProperties,
) {
  switch (event) {
    case ANALYTICS_EVENT.AUTH_LOGIN_SUCCESS:
      return [
        {
          name: "login",
          parameters: compactParameters({
            method: getStringProperty(properties, "method"),
          }),
        },
      ];
    case ANALYTICS_EVENT.AUTH_SIGNUP_SUCCESS:
      return [
        {
          name: "sign_up",
          parameters: compactParameters({
            method: getStringProperty(properties, "method"),
          }),
        },
      ];
    case ANALYTICS_EVENT.BOOKING_STARTED:
      return [
        {
          name: "begin_checkout",
          parameters: compactParameters({
            items: buildItemParameters(properties),
          }),
        },
      ];
    case ANALYTICS_EVENT.BOOKING_SUBMITTED:
      return [
        {
          name: "generate_lead",
          parameters: compactParameters({
            currency: getCurrencyProperty(properties),
            items: buildItemParameters(properties),
            value: getValueFromCents(properties),
          }),
        },
      ];
    case ANALYTICS_EVENT.PAYMENT_INITIATED:
      return [
        {
          name: "add_payment_info",
          parameters: compactParameters({
            currency: getCurrencyProperty(properties),
            items: buildItemParameters(properties),
            payment_type: getStringProperty(properties, "method"),
            value: getValueFromCents(properties),
          }),
        },
      ];
    case ANALYTICS_EVENT.PAYMENT_COMPLETED:
      return [
        {
          name: "purchase",
          parameters: compactParameters({
            currency: getCurrencyProperty(properties),
            items: buildItemParameters(properties),
            payment_type: getStringProperty(properties, "method"),
            transaction_id: getStringProperty(properties, "booking_id"),
            value: getValueFromCents(properties),
          }),
        },
      ];
    default:
      return [];
  }
}

export function isFirebaseAnalyticsEnabled() {
  const hasConfig = Boolean(getFirebaseConfig());
  const explicitlyDisabled =
    process.env.NEXT_PUBLIC_FIREBASE_ANALYTICS_DISABLED === "true";
  const allowInDev =
    process.env.NEXT_PUBLIC_FIREBASE_ANALYTICS_ALLOW_DEV === "true";

  if (!hasConfig || explicitlyDisabled) return false;

  return isBrowserAnalyticsAllowed(allowInDev);
}

async function getFirebaseAnalytics() {
  if (!isFirebaseAnalyticsEnabled()) return null;
  if (typeof window === "undefined") return null;

  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      const supported = await isSupported();
      if (!supported) return null;

      const config = getFirebaseConfig();
      if (!config) return null;

      const app = getApps().length > 0 ? getApp() : initializeApp(config);
      return getAnalytics(app);
    })();
  }

  return analyticsPromise;
}

export async function captureFirebaseEvent(
  event: AnalyticsEventName,
  properties?: AnalyticsEventProperties,
) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  const eventName = sanitizeEventName(event);
  const parameters = sanitizeEventParameters(properties);

  if (eventName === "page_view") {
    const pagePath =
      typeof properties?.$current_url === "string"
        ? properties.$current_url
        : typeof properties?.pathname === "string"
          ? properties.pathname
          : undefined;

    logEvent(analytics, eventName, {
      ...parameters,
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
    });
    return;
  }

  logEvent(analytics, eventName, parameters);

  for (const recommendedEvent of buildRecommendedFirebaseEvents(
    event,
    properties,
  )) {
    logEvent(analytics, recommendedEvent.name, recommendedEvent.parameters);
  }
}

export async function identifyFirebaseUser(
  userId: string,
  properties?: AnalyticsUserProperties,
) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  setUserId(analytics, userId);

  const userProperties = Object.fromEntries(
    Object.entries(properties ?? {}).flatMap(([key, value]) =>
      value === null || value === undefined ? [] : [[key, String(value)]],
    ),
  );

  if (Object.keys(userProperties).length > 0) {
    setUserProperties(analytics, userProperties);
  }
}

export async function resetFirebaseUser() {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  setUserId(analytics, null);
  setUserProperties(analytics, {});
}
