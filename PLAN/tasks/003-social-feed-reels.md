---
id: "003"
title: "Social Feed / Reels with TikTok/Instagram-style Interaction"
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

- [ ] Clicking experience card on explore opens detail modal (not page navigation)
- [ ] Modal shows video/image with autoplay
- [ ] Like button toggles with animation and persists to database
- [ ] Like count updates in real-time
- [ ] Comments section shows existing comments
- [ ] User can add new comment (authenticated only)
- [ ] Share button copies experience URL to clipboard
- [ ] "View details" links to full experience detail page
- [ ] "Book now" opens booking flow
- [ ] Desktop: side-by-side layout (media left, info right)
- [ ] Mobile: full-screen overlay with swipe gestures
- [ ] Navigation between experiences (prev/next arrows or swipe)
- [ ] Unauthenticated users see auth modal when trying to like/comment
- [ ] Smooth animations and transitions

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

- [ ] Read current explore page and CompactExperienceCard
- [ ] Read social tables schema (comments, likes)
- [ ] Read mobile feed and comments for design reference
- [ ] Create `use-social.ts` hook (like/unlike, get comments, add comment, share count)
- [ ] Build ExperienceDetailModal component (desktop side-by-side layout)
- [ ] Build mobile full-screen overlay variant
- [ ] Build LikeButton component with heart animation
- [ ] Build CommentsSection component (list + input)
- [ ] Build ShareButton component (copy to clipboard + toast)
- [ ] Add prev/next navigation between experiences
- [ ] Integrate modal into explore page card clicks
- [ ] Handle auth requirements for interactions
- [ ] Add loading and empty states
- [ ] Polish animations and transitions

## Review Notes

## Agent Log
