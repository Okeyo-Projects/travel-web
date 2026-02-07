import { z } from 'zod';

/**
 * Common enums and types used across the platform
 */

// Languages
export const Language = z.enum(['fr', 'ar', 'en']);
export type Language = z.infer<typeof Language>;

// Translatable content (for database fields)
export const TranslatableTextSchema = z.object({
  fr: z.string(),
  ar: z.string().optional(),
  en: z.string().optional(),
});
export type TranslatableText = z.infer<typeof TranslatableTextSchema>;

// Currency
export const Currency = z.enum(['MAD', 'EUR', 'USD']);
export type Currency = z.infer<typeof Currency>;

// Status types
export const ProfileStatus = z.enum(['active', 'suspended']);
export type ProfileStatus = z.infer<typeof ProfileStatus>;

export const HostStatus = z.enum(['active', 'paused', 'suspended']);
export type HostStatus = z.infer<typeof HostStatus>;

export const ExperienceStatus = z.enum(['draft', 'review', 'published', 'paused', 'rejected']);
export type ExperienceStatus = z.infer<typeof ExperienceStatus>;

// Cancellation Policy
export const CancellationPolicy = z.enum([
  'free',
  'flexible',
  'moderate',
  'strict',
  'non_refundable',
]);
export type CancellationPolicy = z.infer<typeof CancellationPolicy>;

// Pagination
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    meta: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

// Geolocation
export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Location = z.infer<typeof LocationSchema>;

export const AddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string(),
});
export type Address = z.infer<typeof AddressSchema>;

// Date Range
export const DateRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});
export type DateRange = z.infer<typeof DateRangeSchema>;

// Error Response
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  timestamp: z.string().datetime().optional(),
  path: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

