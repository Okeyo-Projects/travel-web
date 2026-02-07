import { z } from 'zod';

/**
 * Social engagement types (likes, shares, saves, follows)
 */

// Likes
export const LikeTargetType = z.enum(['experience', 'review']);
export type LikeTargetType = z.infer<typeof LikeTargetType>;

export const LikeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  targetType: LikeTargetType,
  targetId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type Like = z.infer<typeof LikeSchema>;

export const CreateLikeSchema = z.object({
  targetType: LikeTargetType,
  targetId: z.string().uuid(),
});
export type CreateLike = z.infer<typeof CreateLikeSchema>;

// Shares
export const SharePlatform = z.enum(['whatsapp', 'facebook', 'twitter', 'link', 'other']);
export type SharePlatform = z.infer<typeof SharePlatform>;

export const ShareSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  experienceId: z.string().uuid(),
  platform: SharePlatform.optional(),
  createdAt: z.string().datetime(),
});
export type Share = z.infer<typeof ShareSchema>;

export const CreateShareSchema = z.object({
  experienceId: z.string().uuid(),
  platform: SharePlatform.optional(),
});
export type CreateShare = z.infer<typeof CreateShareSchema>;

// Saves (Bookmarks)
export const SaveSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  experienceId: z.string().uuid(),
  collectionName: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type Save = z.infer<typeof SaveSchema>;

export const CreateSaveSchema = z.object({
  experienceId: z.string().uuid(),
  collectionName: z.string().optional(),
});
export type CreateSave = z.infer<typeof CreateSaveSchema>;

// Follows
export const FollowingType = z.enum(['user', 'host']);
export type FollowingType = z.infer<typeof FollowingType>;

export const FollowSchema = z.object({
  id: z.string().uuid(),
  followerId: z.string().uuid(),
  followingType: FollowingType,
  followingId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type Follow = z.infer<typeof FollowSchema>;

export const CreateFollowSchema = z.object({
  followingType: FollowingType,
  followingId: z.string().uuid(),
});
export type CreateFollow = z.infer<typeof CreateFollowSchema>;

// Reviews
export const ReviewSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  experienceId: z.string().uuid(),
  authorId: z.string().uuid(),
  ratingOverall: z.number().int().min(1).max(5),
  ratingAccuracy: z.number().int().min(1).max(5).optional(),
  ratingCleanliness: z.number().int().min(1).max(5).optional(),
  ratingCommunication: z.number().int().min(1).max(5).optional(),
  ratingLocation: z.number().int().min(1).max(5).optional(),
  ratingValue: z.number().int().min(1).max(5).optional(),
  title: z.string().optional(),
  text: z.string().min(10),
  photos: z.array(z.string().url()).optional(),
  hostResponse: z.string().optional(),
  hostRespondedAt: z.string().datetime().optional(),
  isVerified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid(),
  ratingOverall: z.number().int().min(1).max(5),
  ratingAccuracy: z.number().int().min(1).max(5).optional(),
  ratingCleanliness: z.number().int().min(1).max(5).optional(),
  ratingCommunication: z.number().int().min(1).max(5).optional(),
  ratingLocation: z.number().int().min(1).max(5).optional(),
  ratingValue: z.number().int().min(1).max(5).optional(),
  title: z.string().optional(),
  text: z.string().min(10),
  photos: z.array(z.string().url()).optional(),
});
export type CreateReview = z.infer<typeof CreateReviewSchema>;

