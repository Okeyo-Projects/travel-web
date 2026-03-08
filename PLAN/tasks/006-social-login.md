---
id: "006"
title: "Add Apple Sign-In to Auth Modal"
status: todo
priority: high
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

The auth modal (`auth-modal.tsx`) currently supports email/password login and Google OAuth. Add Apple Sign-In as an additional social login option.

**Changes needed:**
1. Add "Sign in with Apple" button below the Google button in the auth modal
2. Use Supabase Auth's built-in Apple provider (`supabase.auth.signInWithOAuth({ provider: 'apple' })`)
3. Style the Apple button according to Apple's Human Interface Guidelines (black button with Apple logo)
4. Handle the OAuth callback flow (same pattern as Google)

The button should appear on both login and signup views of the auth modal.

Note: Apple Sign-In configuration in Supabase dashboard is a manual step (adding Service ID, Key ID, etc.) -- document what needs to be configured but the code should be ready.

## Acceptance Criteria

- [ ] "Sign in with Apple" button appears in auth modal (login and signup)
- [ ] Button follows Apple's branding guidelines (black background, Apple logo, white text)
- [ ] Clicking triggers Supabase OAuth flow with Apple provider
- [ ] Successful sign-in creates/links account and closes modal
- [ ] Error handling for failed/cancelled Apple sign-in
- [ ] Button appears below Google sign-in button
- [ ] Works on both desktop and mobile layouts

## Context

- Auth modal: `src/components/auth/auth-modal.tsx`
- Auth provider: `src/providers/auth-provider.tsx`
- Auth hook: `src/hooks/use-auth.ts`
- Supabase client: `src/lib/supabase/client.ts`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(auth)/login.tsx`

## Checklist

- [ ] Read current auth modal implementation
- [ ] Read auth provider for OAuth flow pattern (Google)
- [ ] Add Apple sign-in button with proper styling
- [ ] Implement `signInWithOAuth({ provider: 'apple' })` handler
- [ ] Handle success and error states
- [ ] Test on both login and signup views
- [ ] Verify responsive layout

## Review Notes

## Agent Log
