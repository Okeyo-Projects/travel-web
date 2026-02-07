export function formatCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

function formatPrice(amount: number, currency: string): string {
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

export function resolveStorageUrl(path: string | null): string | null {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/storage/v1/object/public/experiences/${path}`;
}
