# 🚀 AI Booking Agent - Setup Commands

## Quick Setup Guide

Follow these commands in order to get your AI booking agent up and running.

---

## Step 1: Install Dependencies

```bash
cd /Users/naimabdelkerim/Code/travel/apps/web

# Install AI SDK packages (if not already installed)
pnpm add @ai-sdk/anthropic openai
```

**Verify installation:**
```bash
pnpm list @ai-sdk/anthropic openai
```

---

## Step 2: Set Environment Variables

Edit your `.env` file:

```bash
# Open .env file
code .env  # or use your preferred editor
```

Add these variables (get keys from OpenAI and Anthropic):

```bash
# AI Services (REQUIRED)
OPENAI_API_KEY=sk-proj-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://nfqamqrxgpyuhjhedllg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_vOj3RrGo-k6ztQhktx82GQ_LRoT5hAF
```

**Get API Keys:**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

---

## Step 3: Run Database Migrations

```bash
cd /Users/naimabdelkerim/Code/travel/infra/supabase

# Option A: Using Supabase CLI (Recommended)
supabase db push

# Option B: Using psql directly
psql -h your-db-host -U postgres -d postgres -f migrations/20260131000001_add_vector_extension_and_embedding.sql
psql -h your-db-host -U postgres -d postgres -f migrations/20260131000002_create_embedding_functions.sql
psql -h your-db-host -U postgres -d postgres -f migrations/20260131000003_create_promo_functions.sql
psql -h your-db-host -U postgres -d postgres -f migrations/20260131000004_create_enhanced_search_function.sql
psql -h your-db-host -U postgres -d postgres -f migrations/20260131000005_setup_embedding_cron_job.sql
psql -h your-db-host -U postgres -d postgres -f migrations/20260131000006_auto_queue_embeddings_on_publish.sql
```

**Verify migrations:**
```sql
-- Connect to your database and run:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%embedding%';
-- Should show: embedding_generation_logs

-- Check if vector extension is enabled:
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Should show: vector

-- Check if pg_cron is enabled:
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
-- Should show: pg_cron
```

---

## Step 4: Configure Database Settings (for Cron Job)

```bash
# Connect to your database
psql -h your-db-host -U postgres -d postgres

# Then run these SQL commands:
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://nfqamqrxgpyuhjhedllg.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';
```

**Get service role key:** Supabase Dashboard → Settings → API → `service_role` key

---

## Step 5: Deploy Supabase Edge Function (Optional but Recommended)

```bash
cd /Users/naimabdelkerim/Code/travel/infra/supabase

# Deploy the embedding generation function
supabase functions deploy generate-embeddings

# Set the OpenAI API key as a secret
supabase secrets set OPENAI_API_KEY=sk-proj-your-openai-key-here
```

**Verify deployment:**
```bash
supabase functions list
# Should show: generate-embeddings
```

---

## Step 6: Generate Initial Embeddings

You have **3 options**:

### Option A: Via Edge Function (Recommended)

```bash
# Using curl
curl -X POST \
  https://nfqamqrxgpyuhjhedllg.supabase.co/functions/v1/generate-embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10, "maxExperiences": 100}'
```

### Option B: Via Admin Dashboard

```bash
# Start dev server first (see Step 7)
# Then visit: http://localhost:3000/admin/embeddings
# Click "Generate All" button
```

### Option C: Via Local Script

```bash
cd /Users/naimabdelkerim/Code/travel/apps/web

# Run the embedding generation script
pnpm embeddings:generate
```

**Check progress:**
```sql
-- See how many experiences have embeddings
SELECT 
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
  COUNT(*) FILTER (WHERE embedding IS NULL) as without_embeddings
FROM experiences 
WHERE status = 'published' AND deleted_at IS NULL;
```

---

## Step 7: Start Development Server

```bash
cd /Users/naimabdelkerim/Code/travel/apps/web

# Start Next.js dev server
pnpm dev
```

**Server will start at:** http://localhost:3000

---

## Step 8: Test the Chat Interface

1. **Visit the chat page:**
   ```
   http://localhost:3000/agent
   ```
   or
   ```
   http://localhost:3000/chat
   ```

2. **Try these test queries:**
   - "Je cherche un hébergement romantique à Marrakech"
   - "Activités pour débutants ce weekend"
   - "Près de moi" (will ask for location)
   - "Montre-moi les offres spéciales"

---

## Step 9: Verify Everything Works

### Check Database Functions

```sql
-- Test embedding text generation
SELECT generate_experience_embedding_text('your-experience-id');

-- Test search function
SELECT * FROM search_experiences_enhanced(
  query_embedding := NULL,
  text_query := 'riad marrakech',
  result_limit := 5
);

-- Check promo functions
SELECT * FROM experience_active_promos('your-experience-id');
```

### Check API Endpoint

```bash
# Test the chat API
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Bonjour"}
    ]
  }'
```

---

## 🎯 Complete Setup Checklist

- [ ] Dependencies installed (`@ai-sdk/anthropic`, `openai`)
- [ ] Environment variables set (`.env` file)
- [ ] Database migrations run (6 migration files)
- [ ] Database settings configured (for cron job)
- [ ] Edge function deployed (optional)
- [ ] Initial embeddings generated
- [ ] Dev server running (`pnpm dev`)
- [ ] Chat interface accessible (`/agent` or `/chat`)
- [ ] Test queries working

---

## 🔧 Troubleshooting Commands

### Check if dependencies are installed:
```bash
pnpm list | grep -E "anthropic|openai|ai"
```

### Check environment variables:
```bash
# In your .env file, verify these exist:
cat .env | grep -E "OPENAI|ANTHROPIC"
```

### Check database connection:
```bash
# Test Supabase connection
cd /Users/naimabdelkerim/Code/travel/apps/web
node -e "const { createClient } = require('@supabase/supabase-js'); const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); supabase.from('experiences').select('count').then(console.log);"
```

### Check if migrations ran:
```sql
-- List all migrations
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 10;

-- Check if vector extension exists
\dx vector

-- Check if embedding column exists
\d experiences | grep embedding
```

### View function logs (if using Edge Function):
```bash
supabase functions logs generate-embeddings --follow
```

### Check cron job status:
```sql
-- View scheduled jobs
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE 'generate-embeddings%';

-- View recent runs
SELECT * FROM embedding_generation_jobs LIMIT 10;
```

---

## 📊 Monitoring Commands

### Check Embedding Status:
```sql
SELECT * FROM get_embedding_stats();
```

### View Pending Embeddings:
```sql
SELECT * FROM pending_embeddings;
```

### Check Cron Job Runs:
```sql
SELECT * FROM embedding_generation_jobs 
ORDER BY started_at DESC 
LIMIT 10;
```

---

## 🚀 Quick Start (All-in-One)

If you want to run everything at once:

```bash
# 1. Install dependencies
cd /Users/naimabdelkerim/Code/travel/apps/web
pnpm add @ai-sdk/anthropic openai

# 2. Set environment variables (edit .env manually)
# Add OPENAI_API_KEY and ANTHROPIC_API_KEY

# 3. Run migrations
cd /Users/naimabdelkerim/Code/travel/infra/supabase
supabase db push

# 4. Configure database settings (run in psql)
# ALTER DATABASE postgres SET app.settings.supabase_url = '...';
# ALTER DATABASE postgres SET app.settings.service_role_key = '...';

# 5. Deploy edge function (optional)
supabase functions deploy generate-embeddings
supabase secrets set OPENAI_API_KEY=sk-proj-...

# 6. Generate embeddings (choose one method above)

# 7. Start dev server
cd /Users/naimabdelkerim/Code/travel/apps/web
pnpm dev

# 8. Visit http://localhost:3000/agent
```

---

## 📝 Notes

- **First time setup**: Takes ~15-20 minutes
- **Embedding generation**: Can take 5-30 minutes depending on number of experiences
- **Cron job**: Runs automatically daily at 2 AM UTC (no manual action needed)
- **Cost**: ~$0.20-$0.50 for initial embeddings, then ~$5-$20/month for chat usage

---

## 🆘 Need Help?

- Check logs: `pnpm dev` output in terminal
- Check browser console: F12 → Console tab
- Check Supabase logs: Dashboard → Logs
- Review documentation: `AI_BOOKING_AGENT_README.md`

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Dev server starts without errors
2. ✅ `/agent` page loads with welcome screen
3. ✅ You can type a message and get a response
4. ✅ AI returns experience cards when searching
5. ✅ Location request works (if you grant permission)
6. ✅ Embeddings are being generated (check admin dashboard)

**You're all set!** 🎉
