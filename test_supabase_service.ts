import { createBrowserClient } from '@supabase/ssr'

async function run() {
  const supabase = createBrowserClient(
    'https://nfqamqrxgpyuhjhedllg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcWFtcXJ4Z3B5dWhqaGVkbGxnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwMDEzMCwiZXhwIjoyMDc0OTc2MTMwfQ.MWWwC78djjQ1FxYdDx6NuVyzcJZfueA2HzGutujaJ8Q'
  )

  const { data, error } = await supabase
    .from('website_testimonials')
    .select('*')
    .limit(1)

  console.log('DATA:', data)
  console.log('ERROR:', error)
}

run()
