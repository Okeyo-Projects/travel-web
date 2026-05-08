const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DEFAULT_TIME_ZONE = "Africa/Casablanca";

export type DateRangeValidation = {
  ok: boolean;
  error?: string;
  code?: "INVALID_DATE" | "PAST_DATE" | "INVALID_DATE_RANGE";
  today_iso: string;
  today_label: string;
  requested_from_date?: string;
  requested_to_date?: string | null;
  requested_from_label?: string;
  requested_to_label?: string;
};

function parseIsoDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;

  const match = DATE_ONLY_RE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function getIsoDateInTimeZone(
  date: Date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function formatDateLabel(isoDate: string, locale = "fr-FR"): string {
  const date = parseIsoDateOnly(isoDate);
  if (!date) return isoDate;

  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function getTodayIsoForBookings(): string {
  return getIsoDateInTimeZone();
}

export function validateFutureDateRange({
  fromDate,
  toDate,
  requireEndAfterStart = false,
  todayIso = getTodayIsoForBookings(),
}: {
  fromDate: string;
  toDate?: string | null;
  requireEndAfterStart?: boolean;
  todayIso?: string;
}): DateRangeValidation {
  const todayLabel = formatDateLabel(todayIso);

  if (!parseIsoDateOnly(fromDate)) {
    return {
      ok: false,
      code: "INVALID_DATE",
      today_iso: todayIso,
      today_label: todayLabel,
      requested_from_date: fromDate,
      error: `Invalid start date "${fromDate}". Dates must use YYYY-MM-DD.`,
    };
  }

  if (toDate && !parseIsoDateOnly(toDate)) {
    return {
      ok: false,
      code: "INVALID_DATE",
      today_iso: todayIso,
      today_label: todayLabel,
      requested_from_date: fromDate,
      requested_to_date: toDate,
      requested_from_label: formatDateLabel(fromDate),
      error: `Invalid end date "${toDate}". Dates must use YYYY-MM-DD.`,
    };
  }

  if (fromDate < todayIso) {
    return {
      ok: false,
      code: "PAST_DATE",
      today_iso: todayIso,
      today_label: todayLabel,
      requested_from_date: fromDate,
      requested_to_date: toDate ?? null,
      requested_from_label: formatDateLabel(fromDate),
      requested_to_label: toDate ? formatDateLabel(toDate) : undefined,
      error: `Cannot use a past start date. Today is ${todayLabel} (${todayIso}); requested start date is ${formatDateLabel(fromDate)} (${fromDate}). Ask the user for a future date.`,
    };
  }

  if (toDate && toDate < fromDate) {
    return {
      ok: false,
      code: "INVALID_DATE_RANGE",
      today_iso: todayIso,
      today_label: todayLabel,
      requested_from_date: fromDate,
      requested_to_date: toDate,
      requested_from_label: formatDateLabel(fromDate),
      requested_to_label: formatDateLabel(toDate),
      error: `End date must be on or after the start date. Requested ${fromDate} -> ${toDate}.`,
    };
  }

  if (requireEndAfterStart && (!toDate || toDate <= fromDate)) {
    return {
      ok: false,
      code: "INVALID_DATE_RANGE",
      today_iso: todayIso,
      today_label: todayLabel,
      requested_from_date: fromDate,
      requested_to_date: toDate ?? null,
      requested_from_label: formatDateLabel(fromDate),
      requested_to_label: toDate ? formatDateLabel(toDate) : undefined,
      error: `Lodging bookings require a check-out date after the check-in date. Requested ${fromDate} -> ${toDate || "missing"}.`,
    };
  }

  return {
    ok: true,
    today_iso: todayIso,
    today_label: todayLabel,
    requested_from_date: fromDate,
    requested_to_date: toDate ?? null,
    requested_from_label: formatDateLabel(fromDate),
    requested_to_label: toDate ? formatDateLabel(toDate) : undefined,
  };
}
