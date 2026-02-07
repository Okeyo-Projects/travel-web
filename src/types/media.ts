import { z } from 'zod';

/**
 * Media and Reel types
 */

export const MediaKind = z.enum(['video', 'photo']);
export type MediaKind = z.infer<typeof MediaKind>;

export const ProcessingStatus = z.enum(['pending', 'processing', 'completed', 'failed']);
export type ProcessingStatus = z.infer<typeof ProcessingStatus>;

export const MediaAssetSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  kind: MediaKind,
  path: z.string(),
  bucket: z.string().default('media'),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  durationSeconds: z.number().int().optional(), // For videos
  processingStatus: ProcessingStatus,
  hlsPlaylistUrl: z.string().url().optional(), // For videos
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

export const CreateMediaUploadUrlSchema = z.object({
  kind: MediaKind,
  experienceId: z.string().uuid().optional(),
  filename: z.string(),
  mimeType: z.string(),
});
export type CreateMediaUploadUrl = z.infer<typeof CreateMediaUploadUrlSchema>;

export const MediaUploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  mediaId: z.string().uuid(),
  path: z.string(),
  expiresAt: z.string().datetime(),
});
export type MediaUploadUrlResponse = z.infer<typeof MediaUploadUrlResponseSchema>;

// Reels
export const ReelVisibility = z.enum(['public', 'unlisted', 'private']);
export type ReelVisibility = z.infer<typeof ReelVisibility>;

export const ReelSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  caption: z.string().optional(),
  videoId: z.string().uuid(),
  experienceId: z.string().uuid().optional(),
  visibility: ReelVisibility,
  viewsCount: z.number().int().default(0),
  likesCount: z.number().int().default(0),
  sharesCount: z.number().int().default(0),
  savesCount: z.number().int().default(0),
  commentsCount: z.number().int().default(0),
  hashtags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Reel = z.infer<typeof ReelSchema>;

export const CreateReelSchema = z.object({
  caption: z.string().max(2200).optional(),
  videoId: z.string().uuid(),
  experienceId: z.string().uuid().optional(),
  visibility: ReelVisibility.default('public'),
  hashtags: z.array(z.string()).optional(),
});
export type CreateReel = z.infer<typeof CreateReelSchema>;

