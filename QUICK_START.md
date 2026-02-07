# AI Booking Agent - Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Add API Keys (1 minute)

Edit `/apps/web/.env` and replace the placeholders:

```bash
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-...

# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 2: Run Database Migrations (2 minutes)

```bash
cd /Users/naimabdelkerim/Code/travel/infra/supabase

# Option A: If using Supabase CLI
supabase db push

# Option B: If using psql directly
psql -d your_database -f migrations/20260131000001_add_vector_extension_and_embedding.sql
psql -d your_database -f migrations/20260131000002_create_embedding_functions.sql
psql -d your_database -f migrations/20260131000003_create_promo_functions.sql
psql -d your_database -f migrations/20260131000004_create_enhanced_search_function.sql
```

### Step 3: Generate Embeddings (2 minutes)

```bash
cd /Users/naimabdelkerim/Code/travel/apps/web
pnpm embeddings:generate
```

This will process all published experiences and generate their embeddings.

### Step 4: Start the App

```bash
pnpm dev
```

### Step 5: Test the Chat

Open http://localhost:3000/chat and try:

1. **Basic Search**
   ```
   "Je cherche un hébergement à Marrakech"
   ```

2. **With Filters**
   ```
   "Activité pas chère pour débutants"
   ```

3. **Location-Based**
   ```
   "Près de moi" (will ask for location permission)
   ```

4. **With Dates**
   ```
   "Hébergement à Essaouira du 15 au 20 février"
   ```

5. **Promo Validation**
   ```
   "Applique le code SUMMER2024 pour cette expérience"
   ```

## 📍 File Locations

### Frontend
- **Chat Page**: `/apps/web/src/app/chat/page.tsx`
- **Main Chat Component**: `/apps/web/src/components/chat/BookingChat.tsx`
- **UI Components**: `/apps/web/src/components/chat/`

### Backend
- **Chat API**: `/apps/web/src/app/api/ai/chat/route.ts`
- **AI Tools**: `/apps/web/src/lib/ai/tools/`
- **System Prompt**: `/apps/web/src/lib/ai/system-prompt.ts`
- **Embeddings**: `/apps/web/src/lib/embeddings/`

### Database
- **Migrations**: `/infra/supabase/migrations/20260131*.sql`

## 🔧 Configuration

### OpenAI Settings
- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536
- **Cost**: ~$0.02 per 1M tokens

### Anthropic Settings
- **Model**: `claude-sonnet-4-20250514`
- **Temperature**: 0.7
- **Max Steps**: 5

### Search Settings
- **Semantic Threshold**: 0.7 (adjust in `search-experiences.ts`)
- **Vector Index**: IVFFlat with 100 lists
- **Default Limit**: 10 results

## 🎯 Common Tasks

### Regenerate Embeddings for Updated Experiences

```typescript
import { regenerateExperienceEmbedding } from '@/lib/embeddings/generate-experience-embedding';

await regenerateExperienceEmbedding('experience-uuid-here');
```

### Adjust Search Threshold

In `/src/lib/ai/tools/search-experiences.ts`:

```typescript
// Lower = more results, less precise
// Higher = fewer results, more precise
semantic_threshold: 0.6, // Default is 0.7
```

### Customize System Prompt

Edit `/src/lib/ai/system-prompt.ts` to change:
- Response style
- Tool usage behavior
- Language preferences
- Feature emphasis

### Add New UI Components

1. Create component in `/src/components/chat/`
2. Add case in `BookingChat.tsx` `UIBlock` component
3. Use in AI responses with markdown:
   ````
   ```ui:your_component { "data": "here" }```
   ````

## 🐛 Troubleshooting

### "No embeddings found"
- Run `pnpm embeddings:generate`
- Check OPENAI_API_KEY is set correctly

### "Search returns no results"
- Lower semantic_threshold to 0.5 or 0.6
- Verify experiences are published
- Check embeddings are generated

### "Chat not responding"
- Check ANTHROPIC_API_KEY is set correctly
- Open browser console for errors
- Verify API route is accessible

### "Invalid promo code"
- Check promotion is active in database
- Verify scope matches experience
- Check date and condition restrictions

## 📊 Monitoring

### Check Embeddings Status

```sql
-- Count experiences with embeddings
SELECT 
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
  COUNT(*) FILTER (WHERE embedding IS NULL) as without_embeddings,
  COUNT(*) as total
FROM experiences 
WHERE status = 'published' AND deleted_at IS NULL;
```

### View Active Promotions

```sql
-- List active promotions
SELECT name, code, discount_type, discount_value, scope, status
FROM promotions
WHERE status = 'active' 
  AND (valid_until IS NULL OR valid_until > NOW())
ORDER BY priority DESC;
```

### Monitor API Usage

Check logs in `/app/api/ai/chat/route.ts` for:
- Token usage
- Completion time
- Error rates

## 🎨 Customization Ideas

### Add More Languages
1. Update `system-prompt.ts` with language-specific guidelines
2. Add translations for UI components
3. Train on multilingual examples

### Add Booking Flow
1. Create booking confirmation component
2. Add `createBookingDraft` tool
3. Integrate with existing booking system

### Add User Preferences
1. Save preferred cities, types, price ranges
2. Use in search rankings
3. Proactive recommendations

### Add Session Persistence
1. Create `ai_chat_sessions` table
2. Save messages to database
3. Load previous conversations

## 📚 Resources

- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **OpenAI Embeddings**: https://platform.openai.com/docs/guides/embeddings
- **Anthropic Claude**: https://docs.anthropic.com/claude/docs
- **pgvector**: https://github.com/pgvector/pgvector
- **PostGIS**: https://postgis.net/documentation/

## 🎉 You're Ready!

The AI booking agent is fully implemented and ready to use. Have fun testing and customizing it!

For detailed documentation, see:
- `AI_BOOKING_AGENT_README.md` - Complete technical guide
- `IMPLEMENTATION_SUMMARY.md` - What was built
- Original `todo.md` - Implementation plan

Questions? Check the troubleshooting section or review the code comments.
