---
id: "020"
title: "SEO Security Headers: X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy"
status: todo
priority: high
created: 2026-03-21
updated: 2026-03-21
assigned: codex
branch: null
pr: null
attempts: 0
depends_on: []
progress: 0
---

## Description

5 of 6 critical security headers are missing. Security headers are a minor direct ranking signal and a significant trust/E-E-A-T signal. They also prevent clickjacking and MIME-sniffing attacks. The `X-Powered-By: Next.js` header is unnecessarily exposed.

**Audit findings addressed:** H2 from `seo-audit-by-issam/OKEYO-ACTION-PLAN.md`.

### Headers to add

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | See below |

**CSP (start with report-only, then enforce):**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
frame-ancestors 'none';
```

Note: Start with `Content-Security-Policy-Report-Only` before enforcing to avoid breaking functionality.

### Implementation

Add via `next.config.ts` `headers()` function (applies to all routes):

```ts
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ]
}
```

Also set `poweredByHeader: false` in the next.config.ts root config object.

Do NOT add CSP as a hard enforce in the first pass — use `Content-Security-Policy-Report-Only` header first to verify nothing breaks, then move to enforcement in a follow-up.

## Acceptance Criteria

- [ ] `X-Frame-Options: SAMEORIGIN` present on all responses
- [ ] `X-Content-Type-Options: nosniff` present on all responses
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` present on all responses
- [ ] `Permissions-Policy` header present on all responses
- [ ] `X-Powered-By` header no longer exposed
- [ ] `Content-Security-Policy-Report-Only` header added (non-breaking first step)
- [ ] HSTS already present — verify it remains unchanged
- [ ] No existing functionality broken by headers

## Context

- Next.js config: `next.config.ts`
- Audit reference: `seo-audit-by-issam/FULL-AUDIT-REPORT.md` (Section 1.3 — Security Headers)
- Action plan reference: `seo-audit-by-issam/OKEYO-ACTION-PLAN.md` (H2)

## Checklist

- [ ] Step 1: Read `next.config.ts` to understand current config
- [ ] Step 2: Add `poweredByHeader: false` to config root
- [ ] Step 3: Add `headers()` function with X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- [ ] Step 4: Add `Content-Security-Policy-Report-Only` header (audit, not enforce)
- [ ] Step 5: Verify existing HSTS / HTTPS config is not broken
- [ ] Step 6: Check no API routes or Supabase calls are broken by headers

## Review Notes

## Agent Log
