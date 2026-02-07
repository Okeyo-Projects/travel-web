# AI Booking Agent Implementation

This document provides an overview of the AI booking agent implementation for the travel platform.

## Overview

The AI booking agent allows users to discover and book experiences (lodging, trips, activities) in Morocco through natural language conversation. It uses:

- **OpenAI** for embeddings (text-embedding-3-small)
- **Claude Sonnet 4** for conversation and reasoning
- **Vercel AI SDK** for streaming chat interface
- **Supabase** with pgvector for semantic search
- **PostGIS** for distance-based search

## Implementation Status

### ✅ Phase 1: Database Setup (COMPLETED)
- Added pgvector extension and embedding column to experiences table
- Created embedding generation function
- Created promotion helper functions (get applicable promos, validate codes)
- Created enhanced search function (semantic + distance + promos + availability)

**Migrations created:**
- `20260131000001_add_vector_extension_and_embedding.sql`
- `20260131000002_create_embedding_functions.sql`
- `20260131000003_create_promo_functions.sql`
- `20260131000004_create_enhanced_search_function.sql`

### ✅ Phase 2: Backend - Embedding Pipeline (COMPLETED)
- Created OpenAI embedding service (`/lib/embeddings/index.ts`)
- Created experience embedding generator (`/lib/embeddings/generate-experience-embedding.ts`)
- Batch processing support with rate limit handling

### ✅ Phase 3: Backend - AI Chat API (COMPLETED)
- Installed dependencies: `@ai-sdk/anthropic`, `openai`
- Created 7 AI tools:
  - `searchExperiences`: Semantic search with filters
  - `getExperienceDetails`: Full experience information
  - `checkAvailability`: Date-based availability checking
  - `getExperiencePromos`: List applicable promotions
  - `validatePromoCode`: Validate and calculate promo discounts
  - `findSimilar`: Vector similarity search
  - `requestUserLocation`: Request user geolocation
- Created comprehensive system prompt
- Created streaming chat API endpoint (`/app/api/ai/chat/route.ts`)

### ✅ Phase 4: Frontend - Chat Components (COMPLETED)
- Created chat context for user location management
- Created message parser for UI blocks
- Created main chat component with streaming
- Created experience card components
- Created location request component
- Created chat page

### 🚧 Phase 5: Integration & Polish (PENDING)
- Location flow handling
- Booking flow integration
- Error handling improvements
- Analytics tracking

### 🚧 Phase 6: Testing & Optimization (PENDING)
- Test various search scenarios
- Performance optimization
- Prompt refinement

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# AI Services
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

### 2. Run Database Migrations

Navigate to the infrastructure directory and run the migrations:

```bash
cd /Users/naimabdelkerim/Code/travel/infra/supabase

# Run migrations (adjust command based on your setup)
supabase db push
# or
psql -d your_database -f migrations/20260131000001_add_vector_extension_and_embedding.sql
psql -d your_database -f migrations/20260131000002_create_embedding_functions.sql
psql -d your_database -f migrations/20260131000003_create_promo_functions.sql
psql -d your_database -f migrations/20260131000004_create_enhanced_search_function.sql
```

### 3. Generate Embeddings for Existing Experiences

After migrations are applied, generate embeddings for existing experiences:

**Option A: Using a script**
Create a script to call the embedding generator:

```typescript
// scripts/generate-embeddings.ts
import { generateAllMissingEmbeddings } from '@/lib/embeddings/generate-experience-embedding';

async function main() {
  console.log('Starting embedding generation...');
  const results = await generateAllMissingEmbeddings(10, 1000);
  console.log(`Completed: ${results.success} successful, ${results.failed} failed`);
}

main();
```

**Option B: Using Supabase Edge Function**
Deploy the embedding generator as an edge function for scheduled execution.

### 4. Start the Development Server

```bash
cd /Users/naimabdelkerim/Code/travel/apps/web
pnpm dev
```

### 5. Access the Chat

Navigate to http://localhost:3000/chat

## File Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── ai/
│   │   │       └── chat/
│   │   │           └── route.ts              # Streaming chat API
│   │   └── chat/
│   │       └── page.tsx                      # Chat page
│   │
│   ├── components/
│   │   └── chat/
│   │       ├── BookingChat.tsx               # Main chat component
│   │       ├── ExperienceCard.tsx            # Experience display card
│   │       ├── ExperienceCardsGrid.tsx       # Grid layout for cards
│   │       └── LocationRequest.tsx           # Location permission UI
│   │
│   ├── contexts/
│   │   └── ChatContext.tsx                   # Chat state management
│   │
│   └── lib/
│       ├── ai/
│       │   ├── tools/
│       │   │   ├── search-experiences.ts     # Search tool
│       │   │   ├── get-experience-details.ts # Details tool
│       │   │   ├── check-availability.ts     # Availability tool
│       │   │   ├── get-experience-promos.ts  # Promos tool
│       │   │   ├── validate-promo-code.ts    # Validation tool
│       │   │   ├── find-similar.ts           # Similarity tool
│       │   │   ├── request-location.ts       # Location tool
│       │   │   └── index.ts                  # Tools export
│       │   └── system-prompt.ts              # AI system prompt
│       │
│       ├── embeddings/
│       │   ├── index.ts                      # OpenAI embedding service
│       │   └── generate-experience-embedding.ts
│       │
│       └── chat/
│           └── parse-message.ts              # Message parsing

infra/supabase/migrations/
├── 20260131000001_add_vector_extension_and_embedding.sql
├── 20260131000002_create_embedding_functions.sql
├── 20260131000003_create_promo_functions.sql
└── 20260131000004_create_enhanced_search_function.sql
```

## Key Features

### Semantic Search
- Uses OpenAI embeddings (1536 dimensions)
- Cosine similarity search with pgvector
- Combines with filters (type, location, price, dates)
- Relevance threshold of 0.7

### Distance-Based Search
- PostGIS for geospatial queries
- Calculates distances from user location
- Filters by maximum distance
- Sorts by proximity

### Promotion System
- Auto-apply promotions
- Code-based promotions
- Eligibility checking (conditions, usage limits)
- Discount calculations (percentage & fixed amount)

### Availability Checking
- Lodging: room availability by date range
- Trips: departure availability
- Activities: session availability
- Capacity and guest count validation

### Conversational UI
- Streaming responses with Vercel AI SDK
- Tool calling for data fetching
- Interactive UI components in chat
- Location permission handling

## Database Functions

### `search_experiences_enhanced()`
Main search function combining:
- Semantic search (vector embeddings)
- Text search (PostgreSQL full-text search)
- Distance calculation (PostGIS)
- Promo information
- Availability checking
- Multiple sort options

### `experience_active_promos()`
Lightweight promo summary for search results

### `get_applicable_promotions()`
Detailed promo list with eligibility status

### `validate_promo_code()`
Validate code and calculate discount

### `generate_experience_embedding_text()`
Generate rich text for embedding from experience data

## AI Tools

Each tool is a function callable by Claude:

1. **searchExperiences**: Natural language search with semantic understanding
2. **getExperienceDetails**: Get comprehensive info about an experience
3. **checkAvailability**: Check dates and get available options
4. **getExperiencePromos**: List all applicable promotions
5. **validatePromoCode**: Validate a code and show savings
6. **findSimilar**: Find similar experiences by vector similarity
7. **requestUserLocation**: Ask for geolocation permission

## Next Steps

### Immediate
1. Add API keys to `.env`
2. Run database migrations
3. Generate embeddings for experiences
4. Test the chat interface

### Short-term
5. Add more UI components (promo displays, availability calendars)
6. Implement booking flow integration
7. Add analytics tracking
8. Error handling improvements

### Long-term
9. Optimize search performance
10. Refine AI prompts based on usage
11. Add multilingual support (Arabic, English)
12. Implement chat session persistence
13. Add advanced features (filters, preferences, recommendations)

## Testing

Example queries to test:

```
- "Je cherche un hébergement romantique à Marrakech"
- "Activités pour débutants ce weekend"
- "Riad pas cher avec piscine"
- "Randonnée dans l'Atlas"
- "Près de moi" (tests location request)
- "Applique le code SUMMER2024" (tests promo validation)
```

## Troubleshooting

### Embeddings not working
- Check OPENAI_API_KEY in .env
- Verify pgvector extension is installed
- Run embedding generation script

### Search returns no results
- Verify experiences have embeddings
- Check semantic_threshold (try lowering to 0.5)
- Ensure experiences are published

### Chat not streaming
- Check ANTHROPIC_API_KEY in .env
- Verify API route is accessible
- Check browser console for errors

## Performance Considerations

- Vector search is optimized with IVFFlat index (100 lists)
- Batch embedding generation to respect rate limits
- Cache frequent searches (future enhancement)
- Edge functions for better latency (future enhancement)

## Security

- API keys in environment variables (never commit)
- RLS policies on Supabase tables
- Input validation on all tools
- Rate limiting on API endpoints (recommended)

## Support

For questions or issues, refer to:
- Vercel AI SDK docs: https://sdk.vercel.ai
- OpenAI API docs: https://platform.openai.com/docs
- Anthropic docs: https://docs.anthropic.com
- Supabase pgvector: https://supabase.com/docs/guides/database/extensions/pgvector
