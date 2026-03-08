---
id: "006"
title: "Add Apple Sign-In to Auth Modal"
status: review
priority: high
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/006-social-login
pr: null
attempts: 0
depends_on: []
progress: 100
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

- [x] Read current auth modal implementation
- [x] Read auth provider for OAuth flow pattern (Google)
- [x] Add Apple logo icon + Apple sign-in button under Google
- [x] Implement `signInWithOAuth({ provider: 'apple' })` using existing redirect pattern
- [x] Add/verify error handling for Apple OAuth failures and cancellations
- [x] Verify button visibility in both login and signup modal states
- [x] Verify mobile and desktop layout spacing/responsiveness
- [x] Document required Supabase Apple provider configuration in task notes

## Review Notes
- Manual Supabase configuration required before Apple OAuth works end-to-end:
  - Enable Apple provider in Supabase Auth providers.
  - Provide Apple Service ID, Team ID, Key ID, and private key in Supabase settings.
  - Add the web redirect URL (`<site-origin>`) and Supabase callback URL in the Apple Developer portal and Supabase provider settings.
  - Ensure the production domain is listed in Apple Sign-In configuration.

## Agent Log

### 2026-03-08
- Started task on branch `task/006-social-login`.
- Reviewed auth modal/provider flow, relevant profile/auth schema and RLS migrations, and mobile login screen reference.
- Converted checklist into small execution steps and marked context-reading steps complete.
- Added Apple OAuth support to auth modal with a black branded button and inline Apple icon placed below Google.
- Reused Supabase OAuth redirect pattern and normalized cancellation/denial errors to a user-friendly message.
- Verified by code path that social buttons are outside login/signup conditional rendering, so Apple appears in both modes on desktop and mobile modal layouts.
- Validation blocked by environment: `pnpm tsc --noEmit` fails (`Command "tsc" not found`) and `pnpm lint` fails (`biome: command not found`) because `node_modules` is missing.
- Marked task ready for review with manual dependency install + runtime OAuth validation pending.
