# AI Booking Agent - Implementation Guide

## Project Overview

Build a conversational AI booking agent for the platform that allows users to discover and book experiences (lodging, trips, activities) in Morocco through natural language interaction.

**Tech Stack:**
- Next.js (existing)
- Supabase (existing)
- Vercel AI SDK (@ai-sdk/anthropic)
- Claude API (claude-sonnet-4-20250514)
- OpenAI Embeddings (text-embedding-3-small)
- PostGIS (existing)
- AI Element for ai components

**Key Features:**
- Semantic search (vector embeddings)
- Promo-aware search and validation
- Distance-based search (user location)
- Interactive UI components in chat
- Multi-turn conversation with context

---

## Phase 1: Database Setup

### 1.1 Add Vector Extension & Column
- [ ] Enable pgvector extension in Supabase
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- [ ] Add embedding column to experiences table
```sql
ALTER TABLE experiences ADD COLUMN embedding vector(1536);
```

- [ ] Create index for fast similarity search
```sql
CREATE INDEX idx_experiences_embedding ON experiences 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 1.2 Create Embedding Generation Function
- [ ] Create SQL function `generate_experience_embedding_text(exp_id UUID)` that:
  - Combines title, short_description, long_description
  - Adds city, region, type
  - For lodging: adds lodging_type, amenities, room types, house_rules
  - For trip/activity: adds category, departure_place, skill_level, physical_difficulty, itinerary
  - Adds included services, tags
  - Returns concatenated text for embedding

### 1.3 Create Promo Functions
- [ ] Create `get_applicable_promotions()` function
  - Input: experience_id, user_id (optional), check_in, nights, guests, amount_cents
  - Checks: scope matching, time conditions, booking conditions, usage limits
  - Returns: list of promos with eligibility status and estimated discount

- [ ] Create `experience_active_promos()` function (lightweight for search)
  - Input: experience_id
  - Returns: has_promo, promo_count, best_badge, best_discount_type, best_discount_value, auto_apply_available

- [ ] Create `validate_promo_code()` function
  - Input: code, experience_id, user_id, check_in, nights, guests, amount_cents
  - Returns: valid boolean, discount amount, new total, or error message

### 1.4 Create Enhanced Search Function
- [ ] Create `search_experiences_enhanced()` function that combines:
  - Semantic search (vector similarity)
  - Distance calculation (PostGIS)
  - Promo information (via experience_active_promos)
  - Availability check (lodging_availability, trip_departures, activity_sessions)
  - All filters (type, city, region, price, rating, guests, date)
  - Sorting options (distance, relevance, promo priority)

### 1.5 Create Chat Session Tables (Optional - for persistence)
- [ ] Create `ai_chat_sessions` table
```sql
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  messages JSONB[] DEFAULT '{}',
  extracted_preferences JSONB DEFAULT '{}',
  user_location JSONB, -- {lat, lng}
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 2: Backend - Embedding Pipeline

### 2.1 Create Embedding Service
- [ ] Create `/lib/embeddings.ts`
  - Function: `embedText(text: string): Promise<number[]>` using OpenAI
  - Function: `embedQuery(query: string): Promise<number[]>` (same but for queries)

### 2.2 Create Experience Embedding Generator
- [ ] Create `/lib/embeddings/generate-experience-embedding.ts`
  - Function: `generateExperienceEmbedding(experienceId: string)`
  - Fetches experience with all related data
  - Builds rich text using the SQL function or TypeScript equivalent
  - Calls OpenAI embedding API
  - Updates experience.embedding in Supabase

### 2.3 Create Embedding Background Job
- [ ] Create Supabase Edge Function or cron job: `generate-embeddings`
  - Finds experiences where embedding IS NULL and status = 'published'
  - Generates embeddings in batches (respect rate limits)
  - Logs progress and errors

### 2.4 Create Embedding Trigger (Optional)
- [ ] Create database trigger on experiences table
  - On INSERT or UPDATE of title, descriptions, or related tables
  - Sets embedding to NULL (marks for re-generation)
  - Or calls edge function directly

---

## Phase 3: Backend - AI Chat API

### 3.1 Install Dependencies
- [ ] Install required packages:
```bash
npm install ai @ai-sdk/anthropic openai zod
```

### 3.2 Create AI Tools
- [ ] Create `/lib/ai/tools/search-experiences.ts`
  - Tool: `searchExperiences`
  - Parameters: query, type, city, region, max_price_mad, min_rating, guests, date, user_lat, user_lng, max_distance_km, sort_by_distance, only_with_promo, only_auto_apply
  - Calls `search_experiences_enhanced` RPC
  - Formats results for AI

- [ ] Create `/lib/ai/tools/get-experience-details.ts`
  - Tool: `getExperienceDetails`
  - Parameters: experience_id
  - Fetches full experience with:
    - Host info
    - Type-specific details (lodging/trip/activity)
    - Room types or departures/sessions
    - Amenities, services
    - Recent reviews
    - Applicable promos

- [ ] Create `/lib/ai/tools/check-availability.ts`
  - Tool: `checkAvailability`
  - Parameters: experience_id, date_from, date_to (optional), guests
  - For lodging: checks lodging_availability by room_type
  - For trip: checks trip_departures
  - For activity: checks activity_sessions
  - Returns available options with pricing

- [ ] Create `/lib/ai/tools/get-experience-promos.ts`
  - Tool: `getExperiencePromos`
  - Parameters: experience_id, user_id, check_in, nights, guests, amount_mad
  - Calls `get_applicable_promotions` RPC
  - Returns eligible and conditional promos

- [ ] Create `/lib/ai/tools/validate-promo-code.ts`
  - Tool: `validatePromoCode`
  - Parameters: code, experience_id, user_id, check_in, nights, guests, amount_mad
  - Calls `validate_promo_code` RPC
  - Returns validation result with discount calculation

- [ ] Create `/lib/ai/tools/find-similar.ts`
  - Tool: `findSimilar`
  - Parameters: experience_id, same_region (optional), same_type (optional)
  - Uses experience's embedding for similarity search
  - Returns similar experiences

- [ ] Create `/lib/ai/tools/request-location.ts`
  - Tool: `requestUserLocation`
  - Parameters: reason
  - Returns special UI component marker for frontend

### 3.3 Create System Prompt
- [ ] Create `/lib/ai/system-prompt.ts`
  - Define comprehensive system prompt including:
    - Platform context (Morocco experiences)
    - Experience types explanation
    - Promo system behavior
    - Distance/location behavior
    - UI component formats (experience_cards, promo_details, etc.)
    - Response guidelines (French, MAD currency, etc.)

### 3.4 Create Chat API Route
- [ ] Create `/app/api/ai/chat/route.ts`
  - POST handler using Vercel AI SDK
  - Import all tools
  - Configure Claude model with tools
  - Enable streaming
  - Set maxSteps for multi-tool calls
  - Handle session context (optional)

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { searchExperiences, getExperienceDetails, checkAvailability, getExperiencePromos, validatePromoCode, findSimilar, requestUserLocation } from '@/lib/ai/tools';

export async function POST(req: Request) {
  const { messages, sessionId, userLocation } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      searchExperiences,
      getExperienceDetails,
      checkAvailability,
      getExperiencePromos,
      validatePromoCode,
      findSimilar,
      requestUserLocation,
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

---

## Phase 4: Frontend - Chat Components

### 4.1 Create Chat Context
- [ ] Create `/contexts/ChatContext.tsx`
  - State: userLocation, setUserLocation
  - State: sessionId
  - Helper: getLocationParams()
  - Provider component

### 4.2 Create Message Parser
- [ ] Create `/lib/chat/parse-message.ts`
  - Function: `parseMessageContent(content: string)`
  - Extracts UI blocks: ```ui:component_name { json }```
  - Returns array of { type: 'text' | 'ui', content: any }

### 4.3 Create UI Components

#### Experience Card
- [ ] Create `/components/chat/ExperienceCard.tsx`
  - Props: experience, onSelect, onBook
  - Displays: thumbnail, title, city, price, rating, distance (if available)
  - Promo badge (if has_promo)
  - Action buttons: Détails, Réserver

#### Experience Cards Grid
- [ ] Create `/components/chat/ExperienceCardsGrid.tsx`
  - Props: experiences, onSelectExperience, onBookExperience
  - Responsive grid layout
  - Summary text (X résultats, Y en promo)

#### Experience Detail Card
- [ ] Create `/components/chat/ExperienceDetailCard.tsx`
  - Props: experience (full details)
  - Sections: images carousel, description, amenities, rooms/departures/sessions
  - Host info
  - Reviews preview
  - Promos list
  - Book CTA

#### Promo Badge
- [ ] Create `/components/chat/PromoBadge.tsx`
  - Props: badge, type
  - Color coding by type

#### Promo List
- [ ] Create `/components/chat/PromoList.tsx`
  - Props: eligible, conditional
  - Displays eligible promos with "Appliquer" or "Auto" badge
  - Shows conditional promos with unmet conditions

#### Promo Validated
- [ ] Create `/components/chat/PromoValidated.tsx`
  - Props: code, valid, discount_mad, original_total, new_total, error_message
  - Success or error state display

#### Quick Replies
- [ ] Create `/components/chat/QuickReplies.tsx`
  - Props: options, onSelect
  - Horizontal scrollable buttons

#### Location Request
- [ ] Create `/components/chat/LocationRequest.tsx`
  - Props: message, onLocationReceived, onDeclined
  - Uses navigator.geolocation
  - Loading and error states
  - "Partager ma position" / "Non merci" buttons

#### Date Picker (Optional)
- [ ] Create `/components/chat/ChatDatePicker.tsx`
  - Props: onSelect, minDate, maxDate
  - Inline calendar component

#### Guest Selector (Optional)
- [ ] Create `/components/chat/GuestSelector.tsx`
  - Props: onSelect, maxGuests
  - Adults, children, infants counters

#### Availability Display
- [ ] Create `/components/chat/AvailabilityDisplay.tsx`
  - Props: type, available, rooms/departures/sessions
  - Shows available options with pricing
  - Select buttons

### 4.4 Create Main Chat Component
- [ ] Create `/components/chat/BookingChat.tsx`
  - Uses `useChat` hook from 'ai/react'
  - Wraps with ChatProvider
  - Message list with parsed content
  - Renders appropriate UI components based on type
  - Input form with send button
  - Loading indicator (typing dots)
  - Scroll to bottom on new message

### 4.5 Create Chat Page
- [ ] Create `/app/chat/page.tsx` or integrate into existing page
  - Import BookingChat component
  - Handle authentication (optional)
  - Pass initial context if needed

---

## Phase 5: Integration & Polish

### 5.1 Handle Location Flow
- [ ] In BookingChat, handle location request UI component
  - When AI returns `request_location: true`
  - Show LocationRequest component
  - On location received, store in context
  - Send follow-up message with location data

### 5.2 Handle Booking Flow
- [ ] Create booking draft functionality
  - When user confirms booking intent
  - AI collects: experience_id, dates, guests, rooms/departure/session
  - Validate availability one more time
  - Apply promo if applicable
  - Redirect to booking confirmation page or create draft booking

### 5.3 Session Persistence (Optional)
- [ ] Save chat messages to ai_chat_sessions
- [ ] Load previous session on page load
- [ ] Allow "Continue conversation" feature

### 5.4 Error Handling
- [ ] Handle API errors gracefully
- [ ] Show user-friendly error messages
- [ ] Retry logic for transient failures
- [ ] Fallback when AI fails

### 5.5 Analytics
- [ ] Track chat events in analytics_events:
  - ai_chat_started
  - ai_search_performed
  - ai_experience_viewed
  - ai_promo_applied
  - ai_booking_initiated

---

## Phase 6: Testing & Optimization

### 6.1 Test Scenarios
- [ ] Test semantic search with various queries:
  - "Un truc romantique à Marrakech"
  - "Rando pour débutants"
  - "Hébergement pet-friendly"
  - "Activité pas chère ce weekend"

- [ ] Test promo scenarios:
  - Global promo
  - Host-specific promo
  - Experience-specific promo
  - Early bird (min_days_before)
  - Last minute (max_days_before)
  - First booking only
  - Code validation (valid, expired, wrong experience, limit reached)

- [ ] Test distance search:
  - "Près de moi"
  - "À moins de 50km"
  - Sort by distance

- [ ] Test availability:
  - Lodging with multiple room types
  - Trip with departures
  - Activity with sessions
  - Date ranges

### 6.2 Performance Optimization
- [ ] Ensure embedding search uses index properly
- [ ] Cache frequent searches (optional)
- [ ] Optimize SQL functions (EXPLAIN ANALYZE)
- [ ] Consider edge functions for latency

### 6.3 Prompt Optimization
- [ ] Test and refine system prompt
- [ ] Ensure AI doesn't hallucinate experiences
- [ ] Verify promo conditions are explained clearly
- [ ] Check response formatting consistency

---

## File Structure

```
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── chat/
│   │           └── route.ts          # Chat API endpoint
│   └── chat/
│       └── page.tsx                  # Chat page
│
├── components/
│   └── chat/
│       ├── BookingChat.tsx           # Main chat component
│       ├── ExperienceCard.tsx        # Single experience card
│       ├── ExperienceCardsGrid.tsx   # Grid of cards
│       ├── ExperienceDetailCard.tsx  # Full experience details
│       ├── PromoBadge.tsx            # Promo badge
│       ├── PromoList.tsx             # List of promos
│       ├── PromoValidated.tsx        # Promo validation result
│       ├── QuickReplies.tsx          # Quick reply buttons
│       ├── LocationRequest.tsx       # Location permission UI
│       ├── ChatDatePicker.tsx        # Date picker
│       ├── GuestSelector.tsx         # Guest counter
│       └── AvailabilityDisplay.tsx   # Availability options
│
├── contexts/
│   └── ChatContext.tsx               # Chat state context
│
├── lib/
│   ├── ai/
│   │   ├── tools/
│   │   │   ├── search-experiences.ts
│   │   │   ├── get-experience-details.ts
│   │   │   ├── check-availability.ts
│   │   │   ├── get-experience-promos.ts
│   │   │   ├── validate-promo-code.ts
│   │   │   ├── find-similar.ts
│   │   │   └── request-location.ts
│   │   ├── system-prompt.ts          # AI system prompt
│   │   └── index.ts                  # Export all tools
│   │
│   ├── embeddings/
│   │   ├── index.ts                  # embedText, embedQuery
│   │   └── generate-experience-embedding.ts
│   │
│   └── chat/
│       └── parse-message.ts          # Message content parser
└── types/
    └── chat.ts                       # Chat-related types

Migration in the supabase infa
├── supabase/
│   └── migrations/
│       ├── 20240102_add_embedding_column.sql
│       ├── 20240103_create_promo_functions.sql
│       └── 20240104_create_search_function.sql
│

```

---

## Environment Variables

```env
# Add to .env.local
OPENAI_API_KEY=sk-...                 # For embeddings
ANTHROPIC_API_KEY=sk-ant-...          # For Claude chat
```

---

## Dependencies to Install

```bash
npm install ai @ai-sdk/anthropic openai zod
```

---

## SQL Migrations Summary

1. **Vector Extension**
   - Enable pgvector
   - Add embedding column
   - Create index

2. **Promo Functions**
   - get_applicable_promotions()
   - experience_active_promos()
   - validate_promo_code()

3. **Search Function**
   - search_experiences_enhanced()
   - Combines: semantic, distance, promos, availability

4. **Embedding Function** (optional, can be done in TypeScript)
   - generate_experience_embedding_text()

---

## Implementation Order

1. **Week 1: Database & Backend Foundation**
   - [ ] Phase 1.1-1.4: Database setup
   - [ ] Phase 2.1-2.3: Embedding pipeline
   - [ ] Phase 3.1-3.2: Install deps, create tools

2. **Week 2: API & Core Chat**
   - [ ] Phase 3.3-3.4: System prompt, API route
   - [ ] Phase 4.1-4.2: Context, parser
   - [ ] Phase 4.3 (partial): Core UI components

3. **Week 3: UI & Integration**
   - [ ] Phase 4.3 (complete): All UI components
   - [ ] Phase 4.4-4.5: Main chat, page
   - [ ] Phase 5.1-5.2: Location, booking flow

4. **Week 4: Polish & Testing**
   - [ ] Phase 5.3-5.5: Persistence, errors, analytics
   - [ ] Phase 6: Testing & optimization

---

## Notes for Claude Code Agent

### Key Decisions Made:
1. Using Vercel AI SDK (not n8n) for low latency and streaming
2. Using OpenAI for embeddings and reasonning
3. Leveraging existing promotions table (not creating new promo system)
4. Using existing activity_sessions for activities (separate from trip_departures)
5. Interactive UI via markdown code blocks (```ui:component_name)

### Important Schema Notes:
- Experiences have 3 types: 'lodging', 'trip', 'activity'
- Lodging uses: experiences_lodging, lodging_room_types, lodging_availability
- Trip uses: experiences_trip, trip_departures, trip_itinerary
- Activity uses: experiences_trip (for details) + activity_sessions (for scheduling)
- Promotions table has comprehensive fields including scope, conditions, limits
- Location is PostGIS geography type
- Prices are stored in cents (price_cents)
- Currency is MAD (Moroccan Dirham)

### Response Language:
- Primary: French
- Support: Arabic, English (based on user preference)
- AI should detect language from user message

### Promo Types in System:
Check the `promotion_type` enum for exact values. Common ones:
- standard, early_bird, last_minute, loyalty, referral, first_booking