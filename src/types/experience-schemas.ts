import { z } from 'zod';
import { CancellationPolicy, Language, LocationSchema } from './common';

/**
 * Experience types and schemas
 * Covers lodging, trip, and activity experiences
 */

// Experience Type
export const ExperienceType = z.enum(['lodging', 'trip', 'activity']);
export type ExperienceType = z.infer<typeof ExperienceType>;

// Base Experience Schema
export const ExperienceBaseSchema = z.object({
  title: z.string().min(3),
  shortDescription: z.string().max(150),
  longDescription: z.string().min(50),
  languages: z.array(Language).min(1),
  city: z.string(),
  region: z.string().optional(),
  location: LocationSchema,
  cancellationPolicy: CancellationPolicy,
});
export type ExperienceBase = z.infer<typeof ExperienceBaseSchema>;

// Lodging Types
export const LodgingType = z.enum([
  'auberge_de_jeunesse',
  'maison_d_hotes',
  'riad',
  'ecolodge',
  'hotel',
  'camping',
  'autre',
]);
export type LodgingType = z.infer<typeof LodgingType>;

export const RoomType = z.enum([
  'dortoir_mixte',
  'dortoir_femmes',
  'chambre_privee',
  'suite',
  'bungalow',
  'tente',
]);
export type RoomType = z.infer<typeof RoomType>;

export const LodgingRoomSchema = z.object({
  roomType: RoomType,
  name: z.string().optional(),
  description: z.string().optional(),
  capacityBeds: z.number().int().positive(),
  maxPersons: z.number().int().positive(),
  equipments: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  extraFees: z.record(z.string(), z.number().int()).optional(),
});
export type LodgingRoom = z.infer<typeof LodgingRoomSchema>;

export const LodgingPayloadSchema = ExperienceBaseSchema.extend({
  type: z.literal('lodging'),
  lodgingType: LodgingType,
  policies: z.object({
    nonFumeur: z.boolean().default(true),
    animauxAcceptes: z.boolean().default(false),
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    minStayNights: z.number().int().default(1).optional(),
  }),
  amenities: z.array(z.string()).default([]),
  rooms: z.array(LodgingRoomSchema).min(1),
});
export type LodgingPayload = z.infer<typeof LodgingPayloadSchema>;

// Trip Types
export const TripCategory = z.enum([
  'journee',
  'randonnee',
  'circuit',
  'outdoor',
  'culturel',
  'aventure',
  'sport',
  'gastronomie',
]);
export type TripCategory = z.infer<typeof TripCategory>;

export const SkillLevel = z.enum(['debutant', 'intermediaire', 'confirme', 'expert']);
export type SkillLevel = z.infer<typeof SkillLevel>;

export const ItineraryItemSchema = z.object({
  day: z.number().int().positive(),
  title: z.string(),
  details: z.string(),
  timeRange: z.tuple([z.string(), z.string()]).optional(),
  locationName: z.string().optional(),
});
export type ItineraryItem = z.infer<typeof ItineraryItemSchema>;

export const TripDepartureSchema = z.object({
  departAt: z.string().datetime(),
  returnAt: z.string().datetime().optional(),
  seatsTotal: z.number().int().positive(),
  seatsAvailable: z.number().int().nonnegative().optional(),
});
export type TripDeparture = z.infer<typeof TripDepartureSchema>;

export const TripPayloadSchema = ExperienceBaseSchema.extend({
  type: z.literal('trip'),
  category: TripCategory,
  skillLevel: SkillLevel.optional(),
  departurePlace: z.string(),
  arrivalPlace: z.string().optional(),
  stops: z.array(z.string()).optional(),
  durationDays: z.number().int().nonnegative().optional(),
  durationHours: z.number().int().nonnegative().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  groupSizeMax: z.number().int().positive(),
  minParticipants: z.number().int().default(1).optional(),
  minAge: z.number().int().nonnegative().optional(),
  restrictions: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  priceChildrenCents: z.number().int().nonnegative().optional(),
  priceGroupCents: z.number().int().nonnegative().optional(),
  priceStudentsCents: z.number().int().nonnegative().optional(),
  included: z.array(z.string()).default([]),
  excluded: z.array(z.string()).default([]),
  itinerary: z.array(ItineraryItemSchema).min(1),
  departures: z.array(TripDepartureSchema).min(1),
});
export type TripPayload = z.infer<typeof TripPayloadSchema>;

// Activity Types (simplified, can be extended)
export const ActivityPayloadSchema = ExperienceBaseSchema.extend({
  type: z.literal('activity'),
  category: z.string(),
  durationHours: z.number().int().positive(),
  maxParticipants: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  included: z.array(z.string()).default([]),
});
export type ActivityPayload = z.infer<typeof ActivityPayloadSchema>;

// Union type for all experience payloads
export const ExperiencePayloadSchema = z.discriminatedUnion('type', [
  LodgingPayloadSchema,
  TripPayloadSchema,
  ActivityPayloadSchema,
]);
export type ExperiencePayload = z.infer<typeof ExperiencePayloadSchema>;
