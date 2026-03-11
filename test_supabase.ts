import { createBrowserClient } from '@supabase/ssr'

async function run() {
  const supabase = createBrowserClient(
    'https://nfqamqrxgpyuhjhedllg.supabase.co',
    'sb_publishable_vOj3RrGo-k6ztQhktx82GQ_LRoT5hAF'
  )

  const { data, error } = await supabase
    .from('website_testimonials')
    .select('id, avatar_key, name, role, message, rate')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  console.log('DATA:', data)
  console.log('ERROR:', error)
}

run()
