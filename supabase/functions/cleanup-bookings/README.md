# Cleanup Bookings Edge Function

Automated cleanup function that runs daily to cancel expired bookings and draft experiences with past dates.

## What It Does

1. **Cancels Expired Pending Bookings**
   - Finds bookings in `pending_host` or `pending_payment` status
   - Where the `from_date` has passed (is in the past)
   - Updates them to `cancelled` status
   - Ready to send notifications/emails

2. **Auto-Drafts Expired Experiences**
   - Finds published trips/activities with only past dates
   - Checks for future departures (trips) or sessions (activities)
   - Updates to `draft` status if no future dates exist
   - Ready to send notifications to hosts

3. **Sends Notifications** (TODO)
   - Placeholder functions ready for implementation
   - Push notifications for cancelled bookings
   - Emails for cancelled bookings
   - Notifications for drafted experiences

## Deployment

```bash
# Deploy the function
supabase functions deploy cleanup-bookings

# Test the function
supabase functions invoke cleanup-bookings \
  --env-file .env.local
```

## Scheduling

### Option 1: Supabase Dashboard (Recommended)

1. Go to **Edge Functions** in Supabase Dashboard
2. Find `cleanup-bookings`
3. Click **Enable Cron**
4. Set schedule: `0 2 * * *` (daily at 2 AM UTC)

### Option 2: Database Cron

```sql
SELECT net.http_post(
  url:='https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-bookings',
  headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
) AS request_id;
```

## Testing

```bash
# Manual test
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-bookings
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-12-16T02:00:00.000Z",
  "summary": {
    "cancelled_bookings": 5,
    "drafted_experiences": 3
  }
}
```

## Adding Notifications

### 1. Push Notifications

Update the `sendCancellationNotification` function:

```typescript
async function sendCancellationNotification(booking: BookingDetails): Promise<void> {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.0');

  // Your push notification implementation
  // Example: Firebase Cloud Messaging, OneSignal, etc.
}
```

### 2. Email Notifications

Update the `sendCancellationEmail` function:

```typescript
async function sendCancellationEmail(booking: BookingDetails): Promise<void> {
  // Your email service implementation
  // Example: SendGrid, Resend, AWS SES, etc.
}
```

### 3. Deploy Changes

```bash
supabase functions deploy cleanup-bookings
```

## Environment Variables

Set these in your Supabase Dashboard → Edge Functions → cleanup-bookings → Settings:

- `SUPABASE_URL`: Your Supabase project URL (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (auto-set)
- Add more as needed for notification services:
  - `SENDGRID_API_KEY`
  - `FIREBASE_SERVER_KEY`
  - etc.

## Logging

View logs in Supabase Dashboard → Edge Functions → cleanup-bookings → Logs

The function logs:
- Number of bookings cancelled
- Number of experiences drafted
- Any errors encountered
- Notification sending results

## Error Handling

The function:
- Continues on individual failures (won't stop if one booking fails)
- Logs all errors for debugging
- Returns success summary even if some operations fail
- Is idempotent (safe to run multiple times)

## Performance

- Runs once daily (minimal cost)
- Efficient database queries
- Processes bookings in batch
- Async notification sending

## Development

### Local Testing

1. Create `.env.local`:
   ```
   SUPABASE_URL=http://localhost:54321
   SUPABASE_SERVICE_ROLE_KEY=your-local-service-key
   ```

2. Start Supabase locally:
   ```bash
   supabase start
   ```

3. Serve the function:
   ```bash
   supabase functions serve cleanup-bookings
   ```

4. Test:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/cleanup-bookings
   ```

### Code Structure

```
cleanup-bookings/
├── index.ts                      # Main entry point
├── README.md                     # This file
└── (future modular structure)
    ├── bookings.ts              # Booking cleanup logic
    ├── experiences.ts           # Experience cleanup logic
    └── notifications.ts         # Notification logic
```

## Monitoring

Check function health:

```sql
-- Recent cancelled bookings
SELECT * FROM bookings
WHERE status = 'cancelled'
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;

-- Recent drafted experiences
SELECT * FROM experiences
WHERE status = 'draft'
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

## Troubleshooting

### Function not executing

1. Check deployment: `supabase functions list`
2. Verify cron is enabled in Dashboard
3. Check function logs for errors
4. Verify service role key is set

### No bookings being cancelled

1. Check if there are expired bookings:
   ```sql
   SELECT * FROM bookings
   WHERE status IN ('pending_host', 'pending_payment')
     AND from_date < CURRENT_DATE;
   ```
2. Manually trigger function to test
3. Check function logs

### No experiences being drafted

1. Check if there are expired experiences:
   ```sql
   SELECT e.* FROM experiences e
   WHERE e.status = 'published'
     AND e.type IN ('trip', 'activity')
     AND NOT experience_has_future_availability(e.id);
   ```
2. Check function logs

## Security

- Uses service role key for database access
- Runs with elevated privileges (be careful with modifications)
- Validates all inputs
- Sanitizes data before database operations

## Future Enhancements

- [ ] Add retry logic for failed notifications
- [ ] Implement email templates
- [ ] Add webhook notifications
- [ ] Create detailed execution reports
- [ ] Add metrics/analytics
- [ ] Implement rate limiting for notifications

## Support

For issues or questions:
1. Check the main [CLEANUP_SETUP.md](../../CLEANUP_SETUP.md)
2. View function logs in Supabase Dashboard
3. Test manually using curl
4. Check database state with SQL queries
