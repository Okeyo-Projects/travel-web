const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function computeDebugEnabled(): boolean {
  const raw = (process.env.AI_DEBUG_LOGS || "").toLowerCase().trim();
  if (TRUE_VALUES.has(raw)) return true;
  if (FALSE_VALUES.has(raw)) return false;
  return process.env.NODE_ENV !== "production";
}

export const AI_DEBUG_ENABLED = computeDebugEnabled();

export function aiDebug(
  scope: string,
  event: string,
  payload?: Record<string, unknown>,
) {
  if (!AI_DEBUG_ENABLED) return;

  const stamp = new Date().toISOString();
  if (payload && Object.keys(payload).length > 0) {
    console.log(`[AI_DEBUG][${stamp}][${scope}] ${event}`, payload);
    return;
  }

  console.log(`[AI_DEBUG][${stamp}][${scope}] ${event}`);
}
