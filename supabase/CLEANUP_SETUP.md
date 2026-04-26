# Automated Booking & Experience Cleanup Setup

This document explains the automated cleanup system for expired bookings and experiences.

## Overview

All cleanup logic is handled by a **Supabase Edge Function** for maximum flexibility and extensibility. This allows you to easily add notifications, emails, and other business logic in the future.

## Features

### 1. **Automatic Booking Cancellation**
- Cancels bookings in `pending_host` or `pending_payment` status
- Only cancels bookings where the `from_date` has passed
- Adds a note to the booking explaining the automatic cancellation
- Ready to send notifications and emails to guests

### 2. **Automatic Experience Drafting**
- Auto-drafts `published` experiences (trips/activities) when all dates are in the past
- Only affects trips with no future departures and activities with no future sessions
- Lodging experiences are not affected (they have continuous availability)
- Ready to send notifications to hosts

### 3. **Frontend Validation**
- Prevents publishing trips/activities without future dates
- Shows clear error message to hosts explaining what needs to be fixed
- Lodging experiences can always be published
- Uses database function `experience_has_future_availability(UUID)`

### 4. **Extensible Architecture**
- All logic in Edge Function for easy updates
- Ready to add push notifications (Firebase, OneSignal, etc.)
- Ready to add email notifications (SendGrid, Resend, etc.)
- No database function dependencies for cleanup
- Easy to test and debug

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Supabase Scheduled Edge Function              │
│  (cleanup-bookings)                             │
│                                                  │
│  Runs daily at 2 AM UTC                         │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Query expired pending bookings              │
│  2. Update bookings to 'cancelled'              │
│  3. Query published experiences                 │
│  4. Check each for future availability          │
│  5. Update experiences to 'draft'               │
│  6. Send notifications (TODO)                   │
│  7. Send emails (TODO)                          │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Database Functions

Only one database function is created for frontend validation:

### `experience_has_future_availability(p_experience_id UUID)`
- Checks if an experience has future departures/sessions
- Returns `TRUE` for lodging (continuous availability)
- Returns `TRUE/FALSE` for trips/activities based on future dates
- Available to authenticated and anonymous users
- Used by the mobile app to prevent publishing without future dates

**All cleanup logic is in the Edge Function** - no database cleanup functions needed!

## Setup Instructions

### Step 1: Apply Database Migration

This creates the frontend validation function only:

```bash
supabase db push
```

Or manually:
```bash
psql "$DATABASE_URL" -f migrations/20251216000000_create_booking_cleanup_functions.sql
```

### Step 2: Deploy the Edge Function

```bash
cd infra/supabase
supabase functions deploy cleanup-bookings
```

### Step 3: Enable Scheduled Execution

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to **Edge Functions** in your Supabase Dashboard
2. Find the `cleanup-bookings` function
3. Click on the function to open its settings
4. Toggle **Enable Cron**
5. Set schedule: `0 2 * * *` (daily at 2 AM UTC)
6. Save

**Option B: Using Database Cron (Alternative)**

If Edge Function cron is not available, use Database Cron:

1. Go to **Database → Cron Jobs**
2. Create new cron job:
   - **Name**: `Daily Booking Cleanup`
   - **Schedule**: `0 2 * * *`
   - **Command**:
     ```sql
     SELECT net.http_post(
       url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-bookings',
       headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
     ) AS request_id;
     ```
   - Replace `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY`

**Option C: External Cron Service**

Use GitHub Actions, cron-job.org, or similar:

```yaml
# .github/workflows/cleanup.yml
name: Daily Cleanup
on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Run Cleanup
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/cleanup-bookings
```

## Testing

### Manual Testing via Edge Function

Test the cleanup manually by calling the Edge Function:

```bash
# Using curl
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-bookings
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-12-16T02:00:00.000Z",
  "summary": {
    "cancelled_bookings": 5,
    "drafted_experiences": 3
  },
  "details": {
    "cancelled_bookings": {
      "count": 5,
      "ids": ["uuid1", "uuid2", "..."]
    },
    "drafted_experiences": {
      "count": 3,
      "ids": ["uuid3", "uuid4", "..."]
    }
  }
}
```

### Test Frontend Validation

```sql
-- Check if specific experience has future availability
SELECT experience_has_future_availability('your-experience-uuid');

-- Find all trips without future departures
SELECT
  e.id,
  e.title,
  e.status,
  experience_has_future_availability(e.id) as has_future
FROM experiences e
WHERE e.type = 'trip'
  AND e.deleted_at IS NULL;
```

### Check Cleanup Results

```sql
-- See recently cancelled bookings
SELECT
  id,
  status,
  from_date,
  host_notes,
  updated_at
FROM bookings
WHERE
  status = 'cancelled'
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;

-- See recently drafted experiences
SELECT
  id,
  title,
  type,
  status,
  updated_at
FROM experiences
WHERE
  status = 'draft'
  AND type IN ('trip', 'activity')
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

## Monitoring

### View Edge Function Logs

1. Go to **Edge Functions** in Supabase Dashboard
2. Click on `cleanup-bookings`
3. View **Logs** tab
4. Check for errors or execution results

### Check Execution History

Edge Function logs will show:
- Number of bookings cancelled
- Number of experiences drafted
- Any errors during execution
- Notification sending status (when implemented)

## Adding Notifications & Emails

The Edge Function has placeholder functions ready for your implementation:

### 1. **Add Push Notifications**

Edit `/infra/supabase/functions/cleanup-bookings/index.ts`:

```typescript
async function sendCancellationNotification(booking: BookingDetails): Promise<void> {
  // Add your push notification service here
  await yourPushService.send({
    user_id: booking.guest_id,
    title: 'Booking Cancelled',
    body: `Your booking for "${booking.experience_title}" has been automatically cancelled.`,
  });
}
```

### 2. **Add Email Notifications**

```typescript
async function sendCancellationEmail(booking: BookingDetails): Promise<void> {
  // Add your email service here
  await yourEmailService.send({
    to: booking.guest_email,
    subject: 'Booking Cancelled',
    template: 'booking-cancelled',
    data: {
      experience_title: booking.experience_title,
      booking_dates: `${booking.from_date} to ${booking.to_date}`,
    },
  });
}
```

### 3. **Deploy Updated Function**

```bash
supabase functions deploy cleanup-bookings
```

## Troubleshooting

### Issue: Edge Function not executing

**Solution:** Check:
1. Function is deployed: `supabase functions list`
2. Cron is enabled in Dashboard → Edge Functions
3. Check function logs for errors

### Issue: Bookings/experiences not being cleaned up

**Solution:**
1. Manually trigger the function to test
2. Check function logs for errors
3. Verify database permissions
4. Check if service role key is correct

### Issue: Frontend validation not working

**Solution:**
```sql
-- Verify function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'experience_has_future_availability';

-- Test the function directly
SELECT experience_has_future_availability('your-experience-uuid');
```

## Security

- Edge Function uses service role key for database access
- All database operations are performed with service role privileges
- Frontend validation function available to all users (safe, read-only)
- Proper error handling prevents data loss
- Idempotent operations (safe to run multiple times)

## Performance

- Edge Function runs asynchronously (doesn't block user requests)
- Efficient queries with proper indexes
- Minimal database load (runs once daily)
- Graceful error handling (continues on individual failures)
- Detailed logging for monitoring

## Cost

- Edge Function executions: Very low (once per day)
- Database queries: Minimal (only fetches records needing updates)
- Notifications/emails: Pay-per-use (when you implement them)

---

## Summary

This cleanup system is designed to be:
- ✅ **Simple**: All logic in one Edge Function
- ✅ **Flexible**: Easy to add notifications, emails, and more
- ✅ **Reliable**: Proper error handling and logging
- ✅ **Scalable**: Efficient queries and async execution
- ✅ **Maintainable**: Clear code structure and documentation

For questions or issues, check the Edge Function logs in your Supabase Dashboard.
