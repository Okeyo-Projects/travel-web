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

const DEFAULT_STORAGE_BUCKET = 'experiences';
const KNOWN_STORAGE_BUCKETS = ['experiences', 'hosts', 'profiles', 'media', 'assets'] as const;
const STORAGE_PUBLIC_PREFIX = 'storage/v1/object/public/';

const normalizeStoragePath = (value: string) => value.replace(/^\/+/, '');
const encodeStoragePath = (value: string) =>
  value
    .split('/')
    .map((segment) => {
      if (!segment) {
        return segment;
      }
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');

const hasKnownBucketPrefix = (value: string) =>
  KNOWN_STORAGE_BUCKETS.some((bucket) => value.startsWith(`${bucket}/`));

export function resolveStorageUrl(path: string | null, bucket: string = DEFAULT_STORAGE_BUCKET): string | null {
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

  const normalized = encodeStoragePath(normalizeStoragePath(path));

  if (normalized.startsWith(STORAGE_PUBLIC_PREFIX)) {
    return `${baseUrl}/${normalized}`;
  }

  const hasBucketPrefix = Boolean(bucket) && normalized.startsWith(`${bucket}/`);
  const finalPath = hasBucketPrefix || hasKnownBucketPrefix(normalized)
    ? normalized
    : bucket
      ? `${bucket}/${normalized}`
      : normalized;

  return `${baseUrl}/${STORAGE_PUBLIC_PREFIX}${finalPath}`;
}

export const getImageUrl = (path?: string, bucket?: string) =>
  resolveStorageUrl(path ?? null, bucket);
