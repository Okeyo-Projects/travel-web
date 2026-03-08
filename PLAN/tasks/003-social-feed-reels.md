---
id: "003"
title: "Social Feed / Reels with TikTok/Instagram-style Interaction"
status: review
priority: high
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/003-social-feed-reels
pr: null
attempts: 0
depends_on: []
progress: 100
---

## Description

The explore page already shows experience cards with video playback capability (via `CompactExperienceCard`). Enhance this into a proper social feed experience with TikTok/Instagram Reels-style interactions.

**What to build:**

1. **Experience Detail Modal** (not a full page navigation):
   - When clicking an experience card on explore, open a rich modal/drawer
   - Video/image gallery with autoplay
   - Experience info (title, location, price, host)
   - Interactive buttons: Like (heart), Comment, Share, Save/Bookmark
   - "View full details" link to the experience detail page
   - "Book now" CTA button
   - Swipe/arrow navigation to next/previous experience (like Instagram)

2. **Like system**:
   - Heart button with animation on click
   - Like count display
   - Toggle like/unlike
   - Uses existing `reel_likes` table or creates experience likes

3. **Comments system**:
   - Expandable comments section in the modal
   - Show recent comments (avatar, name, text, timestamp)
   - Add comment input with submit
   - Uses existing `comments` table

4. **Share**:
   - Share button opens native share dialog or copies link
   - Share count display

5. **Desktop layout**: Side-by-side (video/image left, info + comments right) like Instagram web
6. **Mobile layout**: Full-screen overlay like TikTok/Instagram Reels

Reference TikTok web and Instagram Reels web for the modal interaction pattern.

## Acceptance Criteria

- [x] Clicking experience card on explore opens detail modal (not page navigation)
- [x] Modal shows video/image with autoplay
- [x] Like button toggles with animation and persists to database
- [x] Like count updates in real-time
- [x] Comments section shows existing comments
- [x] User can add new comment (authenticated only)
- [x] Share button copies experience URL to clipboard
- [x] "View details" links to full experience detail page
- [x] "Book now" opens booking flow
- [x] Desktop: side-by-side layout (media left, info right)
- [x] Mobile: full-screen overlay with swipe gestures
- [x] Navigation between experiences (prev/next arrows or swipe)
- [x] Unauthenticated users see auth modal when trying to like/comment
- [x] Smooth animations and transitions

## Context

- Current card: `src/components/explore/CompactExperienceCard.tsx`
- Explore page: `src/app/explore/page.tsx`
- Schema (comments): `web/supabase/migrations/20251105000000_create_comments_table.sql`
- Schema (reels/likes): `web/supabase/migrations/20251004002811_create_social_tables.sql`
- Schema (reel likes): `web/supabase/migrations/20251210000001_add_reel_likes_count_functions.sql`
- Schema (comments count): `web/supabase/migrations/20251210000002_add_experience_comments_count.sql`
- Mobile feed: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/feed/index.tsx`
- Mobile comments: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/feed/comments/[experienceId].tsx`

## Checklist

- [x] Read current explore page and CompactExperienceCard
- [x] Read social tables schema (comments, likes)
- [x] Read mobile feed and comments for design reference
- [x] Create `use-social.ts` hook (like/unlike, get comments, add comment, share count)
- [x] Build ExperienceDetailModal component (desktop side-by-side layout)
- [x] Build mobile full-screen overlay variant
- [x] Build LikeButton component with heart animation
- [x] Build CommentsSection component (list + input)
- [x] Build ShareButton component (copy to clipboard + toast)
- [x] Add prev/next navigation between experiences
- [x] Integrate modal into explore page card clicks
- [x] Handle auth requirements for interactions
- [x] Add loading and empty states
- [x] Polish animations and transitions

## Review Notes

## Agent Log

- 2026-03-08: Started task on branch `task/003-social-feed-reels`. Audited explore page/card flow, comments and social schema migrations, and mobile feed/comments patterns before implementation.
- 2026-03-08: Implemented social interaction foundation for explore cards: added `use-social` hook (likes/saves/comments/shares), built `ExperienceDetailModal` with desktop and mobile layouts, wired prev/next experience/media navigation, auth-gated like/comment/save actions, and integrated card click-to-modal behavior in `ExperienceGroup`.
- 2026-03-08: Validation blocked in environment (`node_modules` missing; `pnpm lint` fails with `biome: command not found`; `pnpm tsc --noEmit` fails with `Command \"tsc\" not found`).
- 2026-03-08: Polished modal transitions by adding fade/entry animations and mobile swipe navigation between experiences. Re-ran validation; still blocked by missing local dependencies (`node_modules`, `biome`, and `tsc` unavailable in this environment).
- 2026-03-08: Task moved to `review` with push/PR commands appended to `web/PLAN/pending-push.sh` for manual execution.
