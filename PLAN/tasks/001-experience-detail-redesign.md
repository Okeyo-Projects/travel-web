---
id: "001"
title: "Redesign Experience Detail Page (Airbnb/Booking-level)"
status: in_progress
priority: high
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/001-experience-detail-redesign-codex
pr: null
attempts: 0
depends_on: []
progress: 20
---

## Description

Redesign the experience detail page (`/experience/[id]`) to match the mobile app's structure and reach Airbnb/Booking.com quality. The current page has basic tabs (Overview, Rooms, Location, Reviews) but needs a complete overhaul to feel polished and professional.

Key improvements:
- **Gallery**: Full-width hero gallery with lightbox, grid layout (1 large + 4 small like Airbnb), "Show all photos" button
- **Header section**: Experience title, location, rating stars with review count, host avatar + name + verification badge, share + save buttons (functional)
- **Overview section**: Highlights bar (duration, max guests, type), detailed description with "Read more" expand, amenities grid with icons, "What's included" / "What's not included" lists
- **Rooms tab**: Card grid with photo carousel per room, capacity, bed count, amenities, per-night price
- **Itinerary tab** (trips): Day-by-day breakdown with services included/excluded (currently missing on web)
- **Stay tab** (lodging): House rules, check-in/out times, cancellation policy (currently missing on web)
- **Location tab**: Replace placeholder with actual interactive map (or static map image from coordinates)
- **Sticky booking sidebar** (desktop): Price, date picker, guest selector, availability check, total estimate
- **Mobile sticky footer**: Price + "Reserve" button
- **Host section**: Host card with avatar, name, member since, response rate, specialties, "Contact host" button
- **Responsive**: Desktop 3-column (gallery/content/sidebar), tablet 2-column, mobile single column

Reference: The mobile app's experience detail at `/Users/naimabdelkerim/Code/travel/apps/mobile/app/experience/[experienceId]/index.tsx` for content structure and information hierarchy.

## Acceptance Criteria

- [ ] Gallery shows grid layout (1 large + 4 thumbnails) with lightbox on click and "Show all photos" button
- [ ] Rating and review count displayed prominently in header
- [ ] Amenities displayed as icon grid (not just text checklist)
- [ ] Itinerary tab renders for trip-type experiences with day-by-day breakdown
- [ ] Stay tab renders for lodging-type experiences with house rules and policies
- [ ] Location shows map (static image or embedded) from experience coordinates
- [ ] Rooms tab shows photo carousel per room card
- [ ] Sticky sidebar on desktop with price and booking CTA
- [ ] Mobile sticky footer with price and reserve button
- [ ] Host section with avatar, name, verification, response stats
- [ ] Share button copies URL to clipboard with toast confirmation
- [ ] Save/wishlist button toggles (visual only for now, no backend)
- [ ] Responsive layout: 3-col desktop, 2-col tablet, 1-col mobile
- [ ] Page matches quality of Airbnb/Booking.com listing pages

## Context

- Current page: `src/app/experience/[id]/page.tsx`
- Experience detail hook: `src/hooks/use-experience-detail.ts`
- Gallery component: `src/components/experience/ExperienceGallery.tsx`
- Schema: `web/supabase/migrations/20251004002801_create_experience_tables.sql`
- Types: `web/src/types/experience-detail.ts`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/experience/[experienceId]/index.tsx`

## Checklist

- [x] Read current experience detail page and all related components
- [x] Read mobile experience detail for design reference
- [x] Read experience schema and types
- [ ] Redesign gallery component (grid layout + lightbox)
- [ ] Build header section (title, location, rating, host, share/save)
- [ ] Redesign overview section (highlights bar, description expand, amenities grid)
- [ ] Build itinerary tab for trip experiences
- [ ] Build stay tab for lodging experiences (house rules, policies)
- [ ] Improve rooms tab with photo carousel per room
- [ ] Improve location tab with map display
- [ ] Build host info section
- [ ] Redesign sticky booking sidebar (desktop)
- [ ] Build mobile sticky footer
- [ ] Ensure responsive layout across breakpoints
- [ ] Polish UI to industry standard

## Review Notes

## Agent Log

### 2026-03-08 (automation run)
- Task started on branch `task/001-experience-detail-redesign-codex` because `task/001-experience-detail-redesign` is currently checked out in another worktree and unavailable in this environment.
- Audited current web page implementation (`src/app/experience/[id]/page.tsx`, `ExperienceGallery`, and `use-experience-detail`) to identify gaps against acceptance criteria.
- Reviewed mobile reference structure in `/apps/mobile/app/experience/[experienceId]/index.tsx` for tab hierarchy and section ordering.
- Reviewed schema/types (`20251004002801_create_experience_tables.sql`, `src/types/experience-detail.ts`) for itinerary, lodging policies, host fields, and room media shape.
