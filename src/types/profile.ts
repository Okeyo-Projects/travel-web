import { z } from 'zod';
import { Language, ProfileStatus } from './common';

/**
 * Profile and Host types
 */

// Host Specialty with i18n support
export const HostSpecialtyTranslationsSchema = z.object({
  fr: z.string(),
  ar: z.string(),
  en: z.string(),
});

export const HostSpecialtySchema = z.object({
  id: z.string().uuid(),
  name: HostSpecialtyTranslationsSchema,
  description: HostSpecialtyTranslationsSchema.optional(),
  icon: z.string().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type HostSpecialty = z.infer<typeof HostSpecialtySchema>;

// Profile
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(2).max(50),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  isHost: z.boolean().default(false),
  status: ProfileStatus,
  preferredLanguage: Language.default('fr'),
  currency: z.string().length(3).default('MAD'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// Host
export const HostSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string().min(2).max(100),
  slug: z.string().optional(),
  bio: z.string().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  country: z.string(),
  city: z.string().optional(),
  verified: z.boolean().default(false),
  languages: z.array(z.string()).default(['fr']),
  specialtyIds: z.array(z.string().uuid()).optional(),
  avgRating: z.number().min(0).max(5).optional(),
  totalExperiences: z.number().int().default(0),
  totalBookings: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Host = z.infer<typeof HostSchema>;

// Create/Update Payloads
export const CreateProfileSchema = ProfileSchema.pick({
  displayName: true,
  preferredLanguage: true,
}).extend({
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
});
export type CreateProfile = z.infer<typeof CreateProfileSchema>;

export const UpdateProfileSchema = CreateProfileSchema.partial();
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;

export const CreateHostSchema = z.object({
  name: z.string().min(2).max(100),
  bio: z.string().max(1000).optional(),
  country: z.string(),
  city: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  languages: z.array(z.string()).default(['fr']),
});
export type CreateHost = z.infer<typeof CreateHostSchema>;

export const UpdateHostSchema = CreateHostSchema.partial();
export type UpdateHost = z.infer<typeof UpdateHostSchema>;

