<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of your project. The existing custom `window.posthog` stub has been replaced with the official `posthog-js` npm package, initialized via `instrumentation-client.ts` (the recommended approach for Next.js 15.3+). A PostHog reverse proxy was added to `next.config.ts` to improve ad-blocker resilience. A new `posthog-server.ts` module was created for server-side tracking using `posthog-node`. Three new events were instrumented — two server-side (preorder signups and AI chat completions) and one error-tracking event (booking submit failures via `posthog.captureException`). Environment variables were written to `.env.local`.

| Event | Description | File |
|---|---|---|
| `preorder_submitted` | A user signed up for the preorder waitlist (server-side) | `src/app/api/preorder/route.ts` |
| `ai_chat_completed` | An AI chat response completed, with model + token usage (server-side) | `src/app/api/ai/chat/route.ts` |
| `booking_submit_failed` | A booking submission failed — captured via `posthog.captureException` | `src/components/booking/steps/step-review.tsx` |

### Infrastructure changes

| File | Change |
|---|---|
| `instrumentation-client.ts` | NEW — initializes posthog-js for Next.js 15.3+ (with session replay + error tracking) |
| `src/lib/analytics/posthog.ts` | Replaced window.posthog stub with posthog-js import |
| `src/lib/analytics/posthog-server.ts` | NEW — server-side PostHog client using posthog-node |
| `src/providers/posthog-provider.tsx` | Simplified — init is now handled by instrumentation-client.ts |
| `next.config.ts` | Added `/ingest` reverse proxy rewrites for ad-blocker resilience |
| `.env.local` | Added `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/344117/dashboard/1364875
- **Booking Conversion Funnel**: https://us.posthog.com/project/344117/insights/yzTARAHi
- **User Acquisition (Logins & Signups)**: https://us.posthog.com/project/344117/insights/6fyqU9wx
- **AI Chat Engagement**: https://us.posthog.com/project/344117/insights/yv4Phkkb
- **Preorder Signups & Logins**: https://us.posthog.com/project/344117/insights/n9bpkeXs
- **Error Health**: https://us.posthog.com/project/344117/insights/cPJ8nCfu

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
