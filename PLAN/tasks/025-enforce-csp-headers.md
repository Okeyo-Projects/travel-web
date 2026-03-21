---
id: "025"
title: "Enforce Content Security Policy headers (upgrade from report-only)"
status: done
priority: high
created: 2026-03-21
updated: 2026-03-21
assigned: codex
pr: null
attempts: 0
depends_on: ["020"]
progress: 0
---

## Description

The CSP is currently `Content-Security-Policy-Report-Only` with `unsafe-inline` for scripts and styles. This provides no actual protection against XSS. The goal is to transition to an enforced CSP that blocks unauthorized scripts.

### Scope

**1. Audit current CSP violations**
- Review the current CSP header in `next.config.ts`
- Identify all inline scripts (PostHog, Facebook Pixel, etc.)
- Identify all external script/style sources

**2. Generate nonces for inline scripts**
- Implement a nonce-based CSP using Next.js middleware
- Generate a unique nonce per request in `src/middleware.ts`
- Pass nonce to `next/script` components and inline scripts
- Replace `unsafe-inline` with `'nonce-{value}'` for scripts

**3. Handle styles**
- Tailwind CSS generates inline styles — may need `unsafe-inline` for `style-src` (acceptable tradeoff)
- Or use a hash-based approach if inline styles are static

**4. Switch to enforced mode**
- Change `Content-Security-Policy-Report-Only` to `Content-Security-Policy`
- Keep a report-uri endpoint for monitoring violations
- Test thoroughly before deploying

## Acceptance Criteria

- [ ] CSP header is `Content-Security-Policy` (enforced, not report-only)
- [ ] `unsafe-inline` removed from `script-src` (replaced with nonces)
- [ ] All legitimate scripts still load (PostHog, Facebook Pixel, Supabase)
- [ ] No console CSP violation errors on any page
- [ ] Middleware generates unique nonce per request
- [ ] All `next/script` and inline script tags include the nonce

## Context

- Next.js config (current CSP): `next.config.ts`
- Middleware: `src/middleware.ts`
- PostHog provider: `src/providers/posthog-provider.tsx`
- Facebook Pixel: check layout.tsx or script components
- Reference: `seo-audit-by-issam/OKEYO-ACTION-PLAN.md` (security section)

## Checklist

- [ ] Step 1: Read current CSP header from `next.config.ts`
- [ ] Step 2: Audit all inline scripts and external sources across the app
- [ ] Step 3: Implement nonce generation in middleware
- [ ] Step 4: Pass nonce to all script components
- [ ] Step 5: Update CSP header to use nonces instead of `unsafe-inline`
- [ ] Step 6: Switch from report-only to enforced
- [ ] Step 7: Test every page for CSP violations
- [ ] Step 8: Verify all analytics/tracking still functions

## Review Notes

## Agent Log
