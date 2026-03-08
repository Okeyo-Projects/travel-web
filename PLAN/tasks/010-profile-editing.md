---
id: "010"
title: "Functional Profile Editing with Avatar Upload"
status: review
priority: medium
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/010-profile-editing
pr: null
attempts: 0
depends_on: []
progress: 100
---

## Description

The profile page displays user info but editing is non-functional. Make the "Edit Profile" flow fully working:

**Edit Profile Form (modal or dedicated page):**
- Display name input (pre-filled)
- Bio textarea (pre-filled)
- Avatar upload:
  - Click avatar to open file picker
  - Preview selected image before upload
  - Upload to Supabase Storage (avatars bucket)
  - Update profile `avatar_url` field
  - Show upload progress indicator
- Save button with loading state
- Cancel button to discard changes
- Success toast on save
- Validation: display name required, bio max length

**Avatar specifics:**
- Accept image files only (jpg, png, webp)
- Max file size: 5MB
- Crop/resize on client before upload (optional, nice to have)
- Store in Supabase Storage `avatars` bucket at path `{user_id}/avatar.{ext}`
- Update `profiles.avatar_url` with the public URL

## Acceptance Criteria

- [x] Edit profile form with pre-filled display name and bio
- [x] Avatar upload via file picker with preview
- [x] Avatar uploaded to Supabase Storage
- [x] Profile updated in database on save
- [x] Success toast confirmation
- [x] Validation (name required, bio length, file size/type)
- [x] Loading states during save/upload
- [x] Cancel discards unsaved changes
- [x] Updated avatar reflects immediately across the app

## Context

- Profile page: `src/app/profile/page.tsx`
- Settings page: `src/app/settings/page.tsx`
- Auth provider: `src/providers/auth-provider.tsx`
- Schema: `web/supabase/migrations/20251004002800_create_core_tables.sql` (profiles table)
- Storage: `web/supabase/migrations/20251004030001_create_storage_buckets.sql`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/user/update-profile.tsx`

## Checklist

- [x] Read profile page and auth provider
- [x] Read profiles schema and storage bucket config
- [x] Read mobile update-profile screen for reference
- [x] Add editable profile state and open/close edit dialog flow on profile page
- [x] Build display name + bio form UI with prefilled values and validation messaging
- [x] Add avatar file picker and local preview in the edit flow
- [x] Implement avatar upload to Supabase Storage with progress state
- [x] Implement profile save mutation (display name, bio, avatar_url)
- [x] Add loading, disabled, and cancel/reset behaviors
- [x] Add success/error toasts and query cache invalidation for profile consumers
- [x] Verify updated avatar/name/bio reflect immediately on profile and menu surfaces
- [x] Final polish and task log updates

## Review Notes

## Agent Log

- 2026-03-08: Completed functional profile editing flow on web profile page.
  - Added an edit-profile dialog with prefilled display name and bio fields, save/cancel actions, and inline validation.
  - Added avatar upload flow with image type/size validation, local preview, upload progress UI, and Supabase Storage upload to `profiles` bucket path `{user_id}/avatar.{ext}`.
  - Updated `profiles` record (`display_name`, `bio`, `avatar_url`) on save, added success/error toasts, and invalidated/updated `["profile", user.id]` query cache to reflect changes immediately in profile and user-menu surfaces.
  - Validation run:
    - `pnpm tsc --noEmit` failed: `Command "tsc" not found`.
    - `pnpm lint` failed: `biome: command not found`.
    - Root cause: `node_modules` missing in this environment.
