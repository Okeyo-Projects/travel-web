# Project Knowledge Base

Read this file before starting any task. It contains essential context about the project architecture, conventions, and current state.

## What Is This Project

A travel experiences platform where users can discover, book, and interact with local experiences and hosts. Features include AI-powered chat for booking assistance, social features (reels, comments, likes), and a host management system.

- **Frontend (Web):** Next.js with App Router, shadcn/ui, Tailwind CSS
- **Frontend (Mobile):** Expo SDK, React Native (primary design reference)
- **Backend:** Supabase (Postgres DB, Auth, Storage, Edge Functions, RLS)
- **AI:** Vercel AI SDK for chat-based booking flows
- **Admin:** TanStack Router + shadcn/ui (in `apps/admin/`)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Framework | Next.js (App Router) |
| UI Components | shadcn/ui (Radix primitives) |
| Styling | Tailwind CSS |
| State | TanStack Query v5 (server cache), React Context (local state) |
| Backend / DB | Supabase (Postgres, Auth, Storage, Edge Functions, RLS) |
| AI | Vercel AI SDK (`ai` package) |
| Payments | Stripe (planned) |
| Types | `web/src/types/` (domain types + auto-generated Supabase types) |
| Admin Panel | TanStack Router + shadcn/ui (`apps/admin/`) |
| Mobile | Expo + React Native + NativeWind (`/Users/naimabdelkerim/Code/travel/apps/mobile/`) |

## Monorepo Structure

```
/travel/                     # Git root
  web/                       # Next.js web app
    src/
      app/                   # Next.js App Router pages
        api/                 # API routes (ai, preorder, etc.)
        chat/                # Chat pages
        bookings/            # Booking pages
        explore/             # Explore/category pages
        collections/         # Collection pages
      components/
        ui/                  # shadcn/ui components (button, card, dialog, etc.)
        chat/                # Chat-specific components
        booking/             # Booking flow components
        home/                # Landing page sections
        site/                # Site-wide components (header, floating chat)
        ai-elements/         # AI message rendering
        auth/                # Auth modal
        explore/             # Explore page components
      hooks/                 # Custom hooks (use-auth, use-booking-mutations, etc.)
      lib/
        ai/                  # AI tools, prompt builder, catalog context
        embeddings/          # Embedding utilities
        supabase/            # Supabase client utilities
        routing/             # URL slug helpers
      types/                 # All types (supabase.ts, booking, experience, payment, etc.)
      providers/             # React context providers (query-provider)
    PLAN/                    # Task management for AI agent
      AGENT.md               # Agent workflow instructions (this file's companion)
      KNOWLEDGE.md           # This file
      REVIEWER.md            # Review agent instructions
      tasks/                 # Task files
  apps/
    mobile/                  # Expo React Native app (design reference)
      app/                   # Expo Router file-based routes
        (auth)/              # Auth screens
        (user)/              # User tabs
        (host)/              # Host tabs
        (onboarding)/        # Onboarding flow
    admin/                   # Admin panel (TanStack Router)
      src/
        features/            # Feature modules
        routes/              # TanStack Router routes
        components/          # Admin components
  web/
    supabase/
      config.toml            # Supabase project config
      migrations/            # ALL Supabase migrations go here
      functions/             # Supabase Edge Functions
```

## Database Schema (Supabase/Postgres)

Key tables (see `web/supabase/migrations/` and `web/src/types/supabase.ts` for full schema):

- **profiles** - User profiles (linked to Supabase Auth)
- **experiences** - Hosted experiences/activities
- **experience_categories** - Category taxonomy
- **experience_types** - Type taxonomy
- **bookings** - Booking records with status lifecycle
- **rooms / room_items** - Room/accommodation configuration
- **availability_**** - Availability management tables
- **media** - Media attachments
- **reels** - Short video content
- **reel_likes / reel_reports** - Social interactions
- **comments** - Experience comments
- **reviews / review_requests** - Review system
- **notifications** - Push/in-app notifications
- **promotions** - Promotional offers
- **support_tickets** - Customer support
- **chat sessions** - AI chat persistence
- **config** - App configuration
- **embedding_log** - Search embedding tracking

## Design Reference

The mobile app (`/Users/naimabdelkerim/Code/travel/apps/mobile/`) is the **primary source of inspiration** for UI/UX design. When implementing web features:
1. Check the corresponding mobile screen in `/Users/naimabdelkerim/Code/travel/apps/mobile/app/` first
2. Adapt the layout and UX patterns for web (responsive, not mobile-only)
3. Use shadcn/ui components to achieve similar visual results
4. Keep the same user flows and information hierarchy

## Data Flow - Understanding Before Building

Before working on any feature, you MUST:
1. Read the relevant Supabase migration files in `web/supabase/migrations/` to understand the table schema
2. Check `web/src/types/supabase.ts` for the auto-generated Supabase types
3. Check `web/src/types/` for the domain-specific type files
4. Understand RLS policies that apply (see `*_rls_policies.sql` migrations)
5. Check existing hooks in `web/src/hooks/` for data fetching patterns already in place

## Coding Conventions

- **Styling**: Tailwind CSS utility classes via `className`. Use shadcn/ui components as building blocks.
- **Components**: Functional, PascalCase files, one component per file
- **State**: TanStack Query for server state, React Context/useState for UI state
- **Data fetching**: Supabase client in hooks or server components. Use TanStack Query for client-side caching.
- **AI**: Use Vercel AI SDK (`useChat`, `streamText`, tool calls) for AI features
- **Types**: All types live in `web/src/types/` (including `supabase.ts` auto-generated types)
- **Imports**: React > Third-party > Internal libs > Hooks > Components > Types
- **Migrations**: ALL Supabase migrations go in `web/supabase/migrations/`, never elsewhere

## Commands Reference

```bash
# From /travel/web/
pnpm dev                       # Next.js dev server
pnpm build                     # Production build
pnpm lint                      # Lint
pnpm tsc --noEmit              # Type check

# From /travel/ (git root)
git checkout -b task/007-xxx   # New task branch

# Supabase (from web/supabase/)
supabase migration new <name>  # Create migration
supabase db push               # Apply migrations
supabase gen types typescript --local > ../src/types/supabase.ts  # Regenerate types
```

## Before Starting Any Task

1. Read this file (KNOWLEDGE.md)
2. Read the specific task file in `web/PLAN/tasks/`
3. Read the relevant Supabase schema/migrations to understand the data model
4. Check `web/src/types/supabase.ts` for current generated types
5. Check the mobile app (`/Users/naimabdelkerim/Code/travel/apps/mobile/`) for design reference
6. Check existing hooks and components in `web/src/` for patterns to follow
7. Build backend (migrations, types) first, then frontend
8. Always create types first, then hook, then component
