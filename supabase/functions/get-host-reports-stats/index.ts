// infra/supabase/functions/get-host-reports-stats/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

async function getHostReportsStats(supabase: any, hostId: string) {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  const { data, error } = await supabase.rpc('get_host_reports_and_stats', { p_host_id: hostId });

  if (error) {
    throw new Error(`Failed to get host reports and stats: ${error.message}`);
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { hostId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const result = await getHostReportsStats(supabase, hostId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
