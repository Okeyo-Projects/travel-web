# Supabase Database Setup

This directory contains all database migrations, functions, and seed data for the Okeyo Experience platform.

## Prerequisites

1. **Supabase CLI** installed globally:
   ```bash
   bun install -g supabase
   ```

2. **Supabase Account**: Create a project at [supabase.com](https://supabase.com)

3. **Environment Variables**: Create a `.env` file in this directory with:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   
   Get these values from: Supabase Dashboard > Settings > API

## Setup Steps

### 1. Link Your Supabase Project

```bash
cd infra/supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your project reference from the Supabase dashboard.

### 2. Apply Migrations

From the **project root**, run:

```bash
bun run db:migrate
```

This will:
- Create all database tables, types, and enums
- Set up Row Level Security (RLS) policies
- Create functions and triggers
- Add performance indexes

### 3. Seed Data

First, install dependencies:

```bash
cd infra/supabase
bun install
```

Then run the seed script:

```bash
# From project root
bun run db:seed
```

This will populate:
- Amenities (WiFi, kitchen, pool, etc.)
- Services (transport, meals, guide, etc.)

**Note**: Test users must be created manually via Supabase Dashboard (Auth > Users) or Auth API.

### 4. Generate TypeScript Types

After migrations are applied, generate types:

```bash
# From project root
bun run db:types
```

This will create `packages/types/src/supabase.ts` with all database types.

## Available Scripts

From the **project root**:

| Command | Description |
|---------|-------------|
| `bun run db:migrate` | Apply all pending migrations |
| `bun run db:reset` | Reset database (⚠️ destroys all data) |
| `bun run db:seed` | Run seed script |
| `bun run db:types` | Generate TypeScript types |
| `bun run db:status` | Check Supabase status |

From the **infra/supabase** directory:

| Command | Description |
|---------|-------------|
| `bun run seed` | Run seed script |
| `bun run migrate` | Apply migrations |
| `bun run reset` | Reset database |
| `bun run gen:types` | Generate types |
| `bun run status` | Check migration status |

## Migration Files

Migrations are in `migrations/` directory, ordered by timestamp:

1. **Extensions** - PostGIS, UUID, trigram
2. **Types** - All ENUMs (experience_type, booking_status, etc.)
3. **Core Tables** - profiles, hosts
4. **Experience Tables** - experiences, lodging, trip, activity, amenities
5. **Media Tables** - media_assets, reels, experience_media
6. **Booking Tables** - bookings, payments, reviews
7. **Social Tables** - likes, shares, saves, follows
8. **Chat Tables** - threads, messages, notifications
9. **Analytics Tables** - events, affiliations, feature_flags
10. **RLS Policies** - Row Level Security for all tables
11. **Functions & Triggers** - Business logic, validation, aggregations
12. **Indexes** - Performance optimization

## Data Model

See `DATA_MODEL.md` in the project root for the complete database schema documentation.

## Troubleshooting

### Error: "No project linked"

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Error: "Migration already applied"

Check current migration status:

```bash
bun run db:status
```

### Error: "Permission denied"

Make sure you're using the **SERVICE_ROLE_KEY** (not the anon key) in your `.env` file.

### Reset Everything

⚠️ **WARNING**: This will delete all data!

```bash
bun run db:reset
bun run db:migrate
bun run db:seed
```

## Local Development with Docker

To use a local Postgres instance instead of Supabase cloud:

```bash
# Start local Supabase
cd infra/supabase
supabase start

# This will give you local URLs and keys
# Update your .env with the local values
```

## Next Steps

After database setup:

1. ✅ Create test users via Supabase Dashboard
2. ✅ Run the mobile app: `bun run dev:mobile`
3. ✅ Run the API: `bun run dev:api`
4. ✅ Start building features (see `TODO.md`)

---

**Version**: 1.0  
**Last Updated**: 2025-10-04
