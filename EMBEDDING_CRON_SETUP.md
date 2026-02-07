# Supabase Edge Function + Cron Job Setup Complete! 🎉

I've created a complete Supabase Edge Function solution with automatic cron job scheduling!

## 📁 What Was Created

### 1. **Supabase Edge Function** 
`/infra/supabase/functions/generate-embeddings/index.ts`

A powerful Edge Function that:
- ✅ Generates embeddings for experiences without them
- ✅ Can regenerate specific experiences by ID
- ✅ Batch processing (configurable batch size)
- ✅ Rate limit handling with delays
- ✅ Detailed logging and error reporting
- ✅ Can be triggered via HTTP or cron

### 2. **Cron Job Setup Migration**
`/infra/supabase/migrations/20260131000005_setup_embedding_cron_job.sql`

Sets up automatic daily execution with:
- ✅ `pg_cron` extension for scheduling
- ✅ Daily cron job (2 AM UTC)
- ✅ Monitoring views for job execution
- ✅ Helper functions for manual triggers
- ✅ Statistics tracking

### 3. **Admin Dashboard**
`/apps/web/src/app/admin/embeddings/page.tsx`

Beautiful admin page with:
- ✅ Real-time statistics (total, with/without embeddings, completion %)
- ✅ Manual trigger buttons (10, 50, or all)
- ✅ Results display with success/failure counts
- ✅ Detailed logs per experience

### 4. **Documentation**
`/infra/supabase/functions/generate-embeddings/README.md`

Complete guide with:
- ✅ Setup instructions
- ✅ Cron job configuration
- ✅ API usage examples
- ✅ Monitoring queries
- ✅ Troubleshooting tips

## 🚀 Setup Steps

### Step 1: Set Environment Variables (Supabase Dashboard)

```bash
OPENAI_API_KEY=sk-proj-your-key-here
```

### Step 2: Deploy the Edge Function

```bash
cd /Users/naimabdelkerim/Code/travel/infra/supabase

# Deploy function
supabase functions deploy generate-embeddings

# Set the secret
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

### Step 3: Run the Cron Job Migration

```bash
# Apply the migration
supabase db push

# Or run manually:
psql -d your_database -f migrations/20260131000005_setup_embedding_cron_job.sql
```

### Step 4: Configure App Settings (in Supabase SQL)

```sql
-- Set your Supabase URL and service role key for cron job
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
```

## 📊 Usage Options

### Option 1: Automatic (Cron Job) ⭐ Recommended

Once deployed, it runs **automatically every day at 2 AM UTC**:
- Processes up to 100 experiences per run
- Batch size of 10 for rate limiting
- No manual intervention needed!

### Option 2: Manual Trigger (HTTP)

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/generate-embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"maxExperiences": 50}'
```

### Option 3: Admin Dashboard

Visit `http://localhost:3000/admin/embeddings`:
- Click "Generate 10" for testing
- Click "Generate All" for full run
- View stats and results in real-time

### Option 4: Database Function

```sql
-- Manual trigger from SQL
SELECT manually_trigger_embeddings();

-- Get current stats
SELECT * FROM get_embedding_stats();
```

## 📈 Monitoring

### View Cron Job Status

```sql
-- Check scheduled jobs
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE 'generate-embeddings%';

-- View recent runs
SELECT * FROM embedding_generation_jobs LIMIT 10;
```

### Check Embedding Progress

```sql
-- Get statistics
SELECT * FROM get_embedding_stats();

-- Result:
{
  "total_experiences": 150,
  "with_embeddings": 120,
  "without_embeddings": 30,
  "percentage_complete": 80.00,
  "last_updated": "2026-01-31T10:30:00Z",
  "published_experiences": 145
}
```

### View Function Logs

```bash
# Follow logs in real-time
supabase functions logs generate-embeddings --follow
```

## 🎯 Cron Schedule Options

The migration includes several schedule options (uncomment the one you want):

```sql
-- Daily at 2 AM (default)
'0 2 * * *'

-- Every hour
'0 * * * *'

-- Every 6 hours
'0 */6 * * *'

-- Twice daily (2 AM and 2 PM)
'0 2,14 * * *'

-- Weekly on Sundays
'0 2 * * 0'
```

## 🔄 Automatic Regeneration on Updates

The migration includes a trigger that automatically marks embeddings for regeneration when content changes:

```sql
-- When title, description, or tags change:
-- → embedding is set to NULL
-- → Next cron job will regenerate it
```

## 🎨 Admin Dashboard Features

The new admin page (`/admin/embeddings`) shows:

1. **Statistics Card**
   - Total experiences
   - With/without embeddings
   - Completion percentage
   - Last updated timestamp

2. **Quick Actions**
   - Generate 10 (for testing)
   - Generate 50 (moderate batch)
   - Generate All (full run)

3. **Results Display**
   - Success/failure counts
   - Individual experience results
   - Error messages if any

4. **Information**
   - How embeddings work
   - Automatic cron schedule
   - Model details

## 💡 Best Practices

### Initial Setup
```bash
# 1. Deploy function
supabase functions deploy generate-embeddings

# 2. Test with small batch
curl ... -d '{"maxExperiences": 10}'

# 3. Run full generation
curl ... -d '{}'

# 4. Set up cron job
# (migration already does this)
```

### Ongoing Maintenance
- ✅ Cron job handles new experiences automatically
- ✅ Trigger regenerates updated experiences
- ✅ Monitor logs weekly
- ✅ Check stats dashboard monthly

### Cost Management
- 1000 experiences ≈ $0.20-$0.50
- Adjust `maxExperiences` in cron to control costs
- Use batch processing to respect rate limits

## 🔧 Troubleshooting

### Cron job not running?

```sql
-- Check if job exists
SELECT * FROM cron.job WHERE jobname = 'generate-embeddings-daily';

-- Check recent runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-embeddings-daily')
ORDER BY start_time DESC LIMIT 5;

-- Manually trigger to test
SELECT manually_trigger_embeddings();
```

### Function fails?

```bash
# Check logs
supabase functions logs generate-embeddings

# Verify environment variable
supabase secrets list
```

### Database settings not found?

```sql
-- Set the required settings
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://xxx.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJ...';
```

## ✨ Advantages Over Local Script

| Feature | Local Script | Edge Function + Cron |
|---------|-------------|---------------------|
| Runs automatically | ❌ | ✅ |
| No local setup needed | ❌ | ✅ |
| Scales with traffic | ❌ | ✅ |
| Monitoring built-in | ❌ | ✅ |
| HTTP API available | ❌ | ✅ |
| Works in production | ⚠️ | ✅ |

## 🎉 You're All Set!

The system is now fully automated:

1. **New experiences** → Cron job picks them up daily
2. **Updated experiences** → Trigger marks for regeneration
3. **Manual needs** → Admin dashboard or HTTP API
4. **Monitoring** → Built-in views and logs

No more manual script running! 🚀
