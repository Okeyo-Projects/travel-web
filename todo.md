# TODO — Web App

## Critical

- [ ] **Payment integration** — Integrate Payzone as the final step of the booking flow. Add payment UI (method selector, card display) after the review step in `booking-modal.tsx`. Wire to the `create-payzone-session` edge function.
- [ ] **Complete booking flow** — The flow currently ends at the review step with no payment. Connect payment gateway, add confirmation screen, and handle post-payment booking status update.
- [ ] **Host portal** — Build the host-facing section of the web app:
  - [ ] Overview dashboard (revenue metrics, upcoming / pending / completed bookings, monthly chart, top experiences)
  - [ ] Experience management (create, edit, publish, pause experiences + media upload)
  - [ ] Booking management (approve / decline requests, view guest details)
  - [ ] Promotions management (create auto-apply and manual code promotions, first-booking discounts, usage tracking)
  - [ ] Reports / analytics page
  - [ ] Host reviews page

## High Priority

- [ ] **Review submission** — Trigger a review prompt after a booking is marked completed. Build rating + comment form and persist to Supabase.
- [ ] **Push notifications** — Integrate web push notifications (Firebase Cloud Messaging). Add `/notifications` page to list past notifications.
- [ ] **Social auth** — Add Google and Apple sign-in providers to `auth-modal.tsx` via Supabase OAuth.

## Medium Priority

- [ ] **Peer-to-peer messaging** — Add real-time user ↔ host chat (separate from the AI concierge). Build chat UI and wire to Supabase Realtime.
- [ ] **Host profile browsing** — Add an `/hosts` page to browse host profiles with their experiences and reviews.
- [ ] **Promotions management UI** — Build a dedicated promotions page beyond `/offers`: auto-apply logic, manual code creation, first-booking modal trigger.
- [ ] **Experience detail — missing sections**:
  - [ ] Video support in the media gallery / carousel
  - [ ] Trust / verification badges section
  - [ ] Cancellation policy display
  - [ ] Trip-specific details section (for trip-type experiences)
- [ ] **Maps** — Add a map to experience detail pages showing the property location.
- [ ] **Onboarding flow** — Add a post-signup onboarding: notification permissions → language → theme.

## Low Priority

- [ ] **RTL layout** — Ensure Arabic locale renders correctly with `dir="rtl"` on root and affected components.
- [ ] **Settings — missing preferences** — Add theme toggle (light / dark) and notification preferences to `/settings`.
- [ ] **Phone number verification** — Add phone input + OTP verification to the auth flow.
- [ ] **Offline / network detection** — Show a banner when the user loses connectivity.
- [ ] **Error tracking** — Integrate Sentry for production error monitoring.
- [ ] **Analytics** — Add structured event tracking beyond Facebook Pixel (search queries, booking starts, booking completions, etc.).
