# Generate Embeddings Edge Function

Supabase Edge Function to generate vector embeddings for experiences using OpenAI's text-embedding-3-small model.

## Features

- ✅ Generates embeddings for experiences without them
- ✅ Can regenerate embeddings for specific experiences
- ✅ Batch processing with rate limit handling
- ✅ Can be triggered manually or by cron job
- ✅ Detailed logging and error reporting

## Setup

### 1. Set Environment Variables

In your Supabase project dashboard:

```bash
# Required
OPENAI_API_KEY=sk-proj-...

# These are automatically available
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Deploy the Function

```bash
cd /Users/naimabdelkerim/Code/travel/infra/supabase
supabase functions deploy generate-embeddings
```

## Usage

### Manual Trigger (via HTTP)

```bash
# Generate embeddings for all experiences without them
curl -X POST \
  https://your-project.supabase.co/functions/v1/generate-embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# With options
curl -X POST \
  https://your-project.supabase.co/functions/v1/generate-embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 10,
    "maxExperiences": 50
  }'

# Regenerate specific experiences
curl -X POST \
  https://your-project.supabase.co/functions/v1/generate-embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "experienceIds": ["uuid1", "uuid2", "uuid3"]
  }'
```

### Cron Job Setup

#### Option 1: Supabase pg_cron (Recommended)

Add to your SQL migrations:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule function to run daily at 2 AM UTC
SELECT cron.schedule(
  'generate-embeddings-daily',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/generate-embeddings',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'batchSize', 10,
        'maxExperiences', 100
      )
    ) AS request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('generate-embeddings-daily');
```

#### Option 2: External Cron (GitHub Actions, etc.)

Create `.github/workflows/generate-embeddings.yml`:

```yaml
name: Generate Embeddings

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger embedding generation
        run: |
          curl -X POST \
            ${{ secrets.SUPABASE_URL }}/functions/v1/generate-embeddings \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"batchSize": 10, "maxExperiences": 100}'
```

## Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `batchSize` | number | 10 | Number of experiences to process concurrently |
| `maxExperiences` | number | null | Maximum number of experiences to process (null = all) |
| `experienceIds` | string[] | null | Specific experience IDs to regenerate |

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Processed 50 experiences",
  "processed": 50,
  "successful": 48,
  "failed": 2,
  "results": [
    {
      "experienceId": "uuid",
      "title": "Experience Title",
      "success": true
    },
    {
      "experienceId": "uuid",
      "title": "Failed Experience",
      "success": false,
      "error": "Error message"
    }
  ]
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

## Monitoring

### Check Logs

```bash
# View function logs
supabase functions logs generate-embeddings

# Follow logs in real-time
supabase functions logs generate-embeddings --follow
```

### Check Cron Job Status

```sql
-- View cron job runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-embeddings-daily')
ORDER BY start_time DESC
LIMIT 10;
```

### Check Embedding Status

```sql
-- Count experiences with/without embeddings
SELECT 
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
  COUNT(*) FILTER (WHERE embedding IS NULL) as without_embeddings,
  COUNT(*) as total
FROM experiences 
WHERE status = 'published' AND deleted_at IS NULL;
```

## Trigger on Experience Update

### Option A: Database Trigger (Automatic)

```sql
-- Mark embedding as NULL when experience content changes
CREATE OR REPLACE FUNCTION mark_embedding_for_regeneration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only mark if content changed
  IF (OLD.title IS DISTINCT FROM NEW.title OR
      OLD.short_description IS DISTINCT FROM NEW.short_description OR
      OLD.long_description IS DISTINCT FROM NEW.long_description OR
      OLD.tags IS DISTINCT FROM NEW.tags) THEN
    NEW.embedding = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mark_embedding_for_regeneration
  BEFORE UPDATE ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION mark_embedding_for_regeneration();
```

### Option B: Manual Regeneration (API)

Create a separate endpoint in your Next.js app:

```typescript
// app/api/admin/regenerate-embedding/route.ts
export async function POST(req: Request) {
  const { experienceId } = await req.json();
  
  // Call Supabase function
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embeddings`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        experienceIds: [experienceId]
      }),
    }
  );
  
  return Response.json(await response.json());
}
```

## Cost Estimation

- **Model**: OpenAI text-embedding-3-small
- **Cost**: ~$0.02 per 1 million tokens
- **Average experience**: ~500-1000 tokens
- **1000 experiences**: ~$0.20-$0.50

## Troubleshooting

### Function fails with "OPENAI_API_KEY not set"

Set the environment variable in Supabase dashboard:
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

### Rate limit errors

Increase delay between batches or reduce `batchSize`:
```json
{
  "batchSize": 5,
  "maxExperiences": 50
}
```

### Some experiences fail

Check function logs for specific errors:
```bash
supabase functions logs generate-embeddings
```

Common issues:
- Missing or invalid experience data
- Database function `generate_experience_embedding_text` not found
- Network timeout (reduce batch size)

## Best Practices

1. **Initial Setup**: Run once manually to generate all embeddings
   ```bash
   curl -X POST ... -d '{"batchSize": 10}'
   ```

2. **Daily Cron**: Keep embeddings up-to-date
   ```sql
   SELECT cron.schedule(..., '0 2 * * *', ...);
   ```

3. **On-Demand**: Regenerate after content updates
   ```bash
   curl -X POST ... -d '{"experienceIds": ["uuid"]}'
   ```

4. **Monitoring**: Check logs regularly
   ```bash
   supabase functions logs generate-embeddings
   ```

## Security

- ✅ Uses Supabase service role key (server-side only)
- ✅ Validates request parameters
- ✅ CORS enabled for API calls
- ✅ Environment variables for secrets
- ⚠️ Consider adding authentication for production

## Next Steps

1. Deploy the function
2. Set environment variables
3. Test with a manual trigger
4. Set up cron job
5. Monitor logs and adjust batch size as needed
