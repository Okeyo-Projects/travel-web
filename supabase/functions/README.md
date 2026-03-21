# Supabase Edge Functions

This directory contains all Supabase Edge Functions for the Okeyo Experience platform.

## Available Functions

### Scheduled / Cron Jobs
- **`cleanup-bookings`** (Daily @ 2AM) - Clean up expired/pending bookings
- **`complete-bookings`** (Daily @ 3AM) - Mark bookings as completed & request reviews
- **`send-trip-reminders`** (Daily @ 9AM) - Send reminders for trips starting tomorrow
- **`send-review-followup`** (Daily @ 10AM) - Send follow-up for pending reviews (3 days later)
- **`check-payment-deadlines`** (Hourly) - Enforce payment deadlines & send urgent reminders

### Utility Functions
- **`send-push-notification`** - Central notification sender (FCM)
- **`send-email`** - Transactional email sender
- **`calculate-quote`** - Calculate booking pricing with promotions and fees
- **`create-booking`** - Handle booking creation and validation
- **`get-auto-apply-promotions`** - Get automatically applied promotions for experiences
- **`get-host-reports-stats`** - Generate host reporting statistics
- **`report-reel`** - Report inappropriate reels
- **`validate-promo-code`** - Validate and apply promo codes

## Deployment Commands

### From Root Directory

```bash
# Deploy all functions to local/staging
bun run functions:deploy

# Deploy all functions to production
bun run functions:deploy:prod

# Serve functions locally for testing
bun run functions:serve

# List all deployed functions
bun run functions:list
```

### From infra/supabase Directory

```bash
# Deploy all functions
bun run functions:deploy

# Deploy to production
bun run functions:deploy:prod

# Deploy a single function
FUNCTION_NAME=calculate-quote bun run functions:deploy:single

# Serve functions locally
bun run functions:serve

# Serve a single function locally
FUNCTION_NAME=calculate-quote bun run functions:serve:single

# List all functions
bun run functions:list

# Delete a function
FUNCTION_NAME=old-function bun run functions:delete
```

## Production Deployment

Before deploying to production, make sure you have:

1. **Supabase CLI installed**:
   ```bash
   npm install -g supabase
   ```

2. **Logged in to Supabase**:
   ```bash
   supabase login
   ```

3. **Set your project reference**:
   ```bash
   export SUPABASE_PROJECT_REF=your-project-ref
   ```

   Or add it to your `.env`:
   ```
   SUPABASE_PROJECT_REF=your-project-ref
   ```

4. **Deploy to production**:
   ```bash
   bun run functions:deploy:prod
   ```

## Individual Function Deployment

To deploy a specific function:

```bash
cd infra/supabase
supabase functions deploy calculate-quote
```

Or using the script:

```bash
FUNCTION_NAME=calculate-quote bun run functions:deploy:single
```

## Local Development

### Serve Functions Locally

```bash
# Serve all functions
bun run functions:serve

# Serve a specific function
FUNCTION_NAME=calculate-quote bun run functions:serve:single
```

### Test Functions

Once serving locally, you can test functions at:
```
http://localhost:54321/functions/v1/{function-name}
```

Example:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/calculate-quote' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"experienceId": "uuid-here"}'
```

## Environment Variables

Edge functions can access environment variables set in your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to Settings > Edge Functions
3. Add environment variables

Common variables used:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## Shared Code

The `_shared` directory contains code shared across multiple functions:
- Database utilities
- Type definitions
- Common validation logic

## Function Structure

Each function follows this structure:

```
function-name/
├── index.ts          # Main function entry point
└── README.md         # Function-specific documentation (optional)
```

## Monitoring

View function logs:

```bash
# View logs for all functions
supabase functions logs

# View logs for a specific function
supabase functions logs calculate-quote

# Follow logs in real-time
supabase functions logs --follow
```

## Best Practices

1. **Keep functions focused** - Each function should do one thing well
2. **Use TypeScript** - All functions are written in TypeScript
3. **Handle errors gracefully** - Always return proper HTTP status codes
4. **Use shared code** - Put common logic in `_shared` directory
5. **Test locally first** - Always test with `functions:serve` before deploying
6. **Set timeouts** - Edge functions have a 150-second timeout limit

## Troubleshooting

### Function not deploying

1. Check you're logged in: `supabase login`
2. Verify project reference: `echo $SUPABASE_PROJECT_REF`
3. Check function syntax: `deno check function-name/index.ts`

### Function failing in production

1. Check logs: `supabase functions logs function-name`
2. Verify environment variables are set
3. Test locally with same data

### Permission errors

Make sure you have the correct RLS policies and service role keys configured.
