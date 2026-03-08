---
id: "010"
title: "Functional Profile Editing with Avatar Upload"
status: todo
priority: medium
created: 2026-03-07
updated: 2026-03-07
assigned: codex
branch: null
pr: null
attempts: 0
depends_on: []
progress: 0
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

- [ ] Read profile page and auth provider
- [ ] Read profiles schema and storage bucket config
- [ ] Read mobile update-profile screen for reference
- [ ] Build EditProfileModal/page component
- [ ] Implement avatar file picker with preview
- [ ] Implement Supabase Storage upload for avatars
- [ ] Implement profile update mutation
- [ ] Add form validation
- [ ] Add loading and success states
- [ ] Verify avatar updates reflect across app
- [ ] Polish UI

## Review Notes

## Agent Log
