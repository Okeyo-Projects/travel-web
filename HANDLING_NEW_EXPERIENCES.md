# 🔄 Handling Regular New Experiences - Complete Guide

## Overview

Your platform accepts new experiences regularly, and the AI booking agent needs embeddings to make them searchable. Here's how the system handles this **automatically**.

---

## ✅ **Current Setup: 3 Automatic Methods**

### **Method 1: Daily Cron Job** (Default) ⭐

**How it works:**
```
Day 1, 10 AM → Host publishes new experience
Day 1, 2 PM  → Host publishes another experience
Day 2, 2 AM  → Cron job runs
              → Finds both experiences (embedding = NULL)
              → Generates embeddings for both
              → Experiences now searchable in AI chat!
```

**Configuration:**
- Runs: Daily at 2 AM UTC
- Processes: Up to 100 experiences per run
- Batch size: 10 at a time
- Cost: ~$0.001-0.005 per experience

**Pros:**
- ✅ Fully automatic
- ✅ No code changes needed
- ✅ Handles any volume
- ✅ Cost-effective (batched)

**Cons:**
- ⏱️ Up to 24-hour delay

---

### **Method 2: Database Trigger** (New Migration) 🆕

**How it works:**
```
Host clicks "Publish" → status = 'published'
                      → Trigger fires
                      → embedding = NULL (marked for generation)
                      → Logged in monitoring table
                      → Next cron run picks it up
```

**Installation:**
```bash
# Run the new migration
psql -d db -f migrations/20260131000006_auto_queue_embeddings_on_publish.sql
```

**What it does:**
- Automatically marks new published experiences
- Logs to `embedding_generation_logs`
- Provides monitoring views
- Zero code changes in app

**Monitoring:**
```sql
-- Check pending count
SELECT * FROM count_pending_embeddings();

-- View pending experiences
SELECT * FROM pending_embeddings;

-- Find experiences pending > 1 hour
SELECT * FROM pending_embeddings WHERE hours_pending > 1;
```

---

### **Method 3: Real-Time API Call** (Instant) ⚡

**How it works:**
```
Host clicks "Publish" → API call to Edge Function
                      → Embedding generated immediately
                      → Experience searchable in ~5-30 seconds
```

**Implementation:**

Add to your publish route:

```typescript
// apps/web/src/app/api/experiences/[id]/publish/route.ts

import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  
  // 1. Update experience status to published
  const { error: updateError } = await supabase
    .from('experiences')
    .update({ 
      status: 'published',
      published_at: new Date().toISOString()
    })
    .eq('id', params.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 400 });
  }

  // 2. Trigger immediate embedding generation (optional but recommended)
  try {
    const embeddingResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embeddings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experienceIds: [params.id],
          batchSize: 1
        }),
      }
    );

    const embeddingResult = await embeddingResponse.json();
    console.log('Embedding generation triggered:', embeddingResult);
    
    // Don't block on embedding generation
    // It runs async in the background
  } catch (error) {
    // Log but don't fail the publish
    console.error('Failed to trigger embedding generation:', error);
    // Cron job will pick it up later
  }

  return Response.json({ 
    success: true,
    message: 'Experience published successfully',
    embedding_status: 'generating'
  });
}
```

**Pros:**
- ✅ Instant availability (5-30 seconds)
- ✅ Best user experience
- ✅ No waiting for cron

**Cons:**
- ⚠️ Requires code change in publish flow
- ⚠️ Slightly higher per-request cost

---

## 🎯 **Recommended Setup**

### **For Most Cases** (Hybrid Approach)

Combine all three methods:

1. **Daily Cron Job** → Safety net (catches any missed)
2. **Database Trigger** → Automatic marking (monitoring)
3. **Real-Time API Call** → Instant for critical experiences

```typescript
// apps/web/src/app/api/experiences/[id]/publish/route.ts

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // ... publish logic ...
  
  // Trigger real-time embedding for VIP hosts or featured experiences
  const { data: experience } = await supabase
    .from('experiences')
    .select('host:hosts(tier)')
    .eq('id', params.id)
    .single();
  
  if (experience?.host?.tier === 'vip' || experience?.host?.tier === 'premium') {
    // Generate immediately for VIP hosts
    await fetch(embeddings_url, { ... });
  } else {
    // Regular hosts wait for cron job (max 24h)
    // This is fine because cron runs daily
  }
}
```

---

## 📊 **Monitoring New Experiences**

### **Admin Dashboard Enhancement**

Update the admin embeddings page to show pending experiences:

```typescript
// Add to /apps/web/src/app/admin/embeddings/page.tsx

const [pending, setPending] = useState<any[]>([]);

const fetchPending = async () => {
  const supabase = createClient();
  const { data } = await supabase.from('pending_embeddings').select('*');
  setPending(data || []);
};

// In the UI:
<Card>
  <CardHeader>
    <CardTitle>Pending Embeddings</CardTitle>
  </CardHeader>
  <CardContent>
    {pending.length === 0 ? (
      <p className="text-muted-foreground">No pending experiences</p>
    ) : (
      <div className="space-y-2">
        {pending.map(exp => (
          <div key={exp.id} className="flex items-center justify-between p-2 bg-muted rounded">
            <div>
              <p className="font-medium">{exp.title}</p>
              <p className="text-xs text-muted-foreground">
                {exp.type} • {exp.city} • Waiting {Math.round(exp.hours_pending)}h
              </p>
            </div>
            <Button size="sm" onClick={() => generateEmbeddings({ experienceIds: [exp.id] })}>
              Generate Now
            </Button>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

---

## 🔔 **Notifications (Optional)**

### **Slack/Discord Webhook**

Alert when pending experiences exceed threshold:

```typescript
// apps/web/src/lib/notifications/embedding-alerts.ts

export async function checkPendingEmbeddings() {
  const supabase = createClient();
  const { data } = await supabase.rpc('count_pending_embeddings');
  
  if (data.pending_count > 50) {
    // Send alert
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        text: `⚠️ ${data.pending_count} experiences waiting for embeddings!`,
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Embedding Queue Alert*\n\n` +
                  `• Pending: ${data.pending_count}\n` +
                  `• Oldest: ${data.oldest_pending}\n` +
                  `• Action: Check admin dashboard`
          }
        }]
      })
    });
  }
}

// Run this periodically (e.g., via cron or API endpoint)
```

---

## 📈 **Scaling Considerations**

### **High Volume** (100+ experiences/day)

If you receive many experiences daily:

1. **Increase Cron Frequency**
   ```sql
   -- Run every 6 hours instead of daily
   SELECT cron.schedule(
     'generate-embeddings-6h',
     '0 */6 * * *',
     'SELECT trigger_embedding_generation();'
   );
   ```

2. **Increase Batch Size**
   ```typescript
   // In edge function call
   body: JSON.stringify({
     batchSize: 20, // Was 10
     maxExperiences: 200 // Was 100
   })
   ```

3. **Parallel Processing**
   ```typescript
   // Process multiple experiences in parallel
   const batches = chunk(experienceIds, 10);
   await Promise.all(
     batches.map(batch => 
       fetch(embeddings_url, { 
         body: JSON.stringify({ experienceIds: batch }) 
       })
     )
   );
   ```

---

## 💰 **Cost Analysis**

### **Scenario: 50 New Experiences/Day**

**Daily Cron (Default):**
- Cost: ~$0.10-0.25/day
- When: 2 AM UTC
- Delay: Up to 24 hours

**Real-Time API (All):**
- Cost: ~$0.10-0.25/day (same)
- When: Immediately on publish
- Delay: 5-30 seconds
- Extra: Slightly higher compute costs

**Hybrid (VIP Real-Time):**
- Cost: ~$0.10-0.25/day
- VIP: Instant (5-30 seconds)
- Regular: Cron pickup (up to 24h)
- Best balance of cost and UX

---

## 🎯 **Recommended Setup by Scale**

### **Small Scale** (1-10 experiences/day)
```
✅ Daily cron job (2 AM)
✅ Database trigger (monitoring)
❌ Real-time API (not needed)
```

### **Medium Scale** (10-50 experiences/day)
```
✅ Daily cron job (2 AM)
✅ Database trigger (monitoring)
✅ Real-time API for VIP hosts only
```

### **Large Scale** (50+ experiences/day)
```
✅ 6-hour cron job
✅ Database trigger (monitoring)
✅ Real-time API for all
✅ Monitoring dashboard
✅ Alerts for queue size
```

---

## 🔍 **Testing the Flow**

### **Test New Experience Flow:**

```bash
# 1. Create a test experience via your app
# 2. Publish it

# 3. Check if it's marked for embedding
psql -d db -c "SELECT id, title, embedding FROM experiences WHERE id = 'your-test-id';"
# Should show: embedding = NULL

# 4. View in pending queue
psql -d db -c "SELECT * FROM pending_embeddings WHERE id = 'your-test-id';"

# 5. Manually trigger embedding
curl -X POST https://xxx.supabase.co/functions/v1/generate-embeddings \
  -d '{"experienceIds": ["your-test-id"]}'

# 6. Verify embedding was generated
psql -d db -c "SELECT id, title, embedding IS NOT NULL as has_embedding FROM experiences WHERE id = 'your-test-id';"
# Should show: has_embedding = true

# 7. Test in chat
# Visit /chat and search for your experience
```

---

## ✅ **Summary**

Your system now handles new experiences **automatically** with:

1. ✅ **Daily cron job** - Catches all new experiences (max 24h delay)
2. ✅ **Database trigger** - Marks and monitors (NEW migration)
3. ✅ **Real-time API option** - Instant embedding (optional code change)
4. ✅ **Admin dashboard** - Monitor and manually trigger
5. ✅ **Monitoring views** - Track pending queue

**Default behavior:** New experiences are automatically picked up by the daily cron job. No action needed!

**For instant search:** Add real-time API call to your publish flow (5 minutes of work).

Choose the approach that fits your volume and UX requirements! 🚀
