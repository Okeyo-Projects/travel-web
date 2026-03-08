---
id: "010"
title: "Functional Profile Editing with Avatar Upload"
status: in_progress
priority: medium
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/010-profile-editing
pr: null
attempts: 0
depends_on: []
progress: 5
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

- [ ] Edit profile form with pre-filled display name and bio
- [ ] Avatar upload via file picker with preview
- [ ] Avatar uploaded to Supabase Storage
- [ ] Profile updated in database on save
- [ ] Success toast confirmation
- [ ] Validation (name required, bio length, file size/type)
- [ ] Loading states during save/upload
- [ ] Cancel discards unsaved changes
- [ ] Updated avatar reflects immediately across the app

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
- [ ] Add editable profile state and open/close edit dialog flow on profile page
- [ ] Build display name + bio form UI with prefilled values and validation messaging
- [ ] Add avatar file picker and local preview in the edit flow
- [ ] Implement avatar upload to Supabase Storage with progress state
- [ ] Implement profile save mutation (display name, bio, avatar_url)
- [ ] Add loading, disabled, and cancel/reset behaviors
- [ ] Add success/error toasts and query cache invalidation for profile consumers
- [ ] Verify updated avatar/name/bio reflect immediately on profile and menu surfaces
- [ ] Final polish and task log updates

## Review Notes

## Agent Log
