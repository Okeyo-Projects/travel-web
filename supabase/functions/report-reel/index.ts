// infra/supabase/functions/report-reel/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ReportReelRequest {
  reelId: string;
  reporterId: string;
  reason: 'violence' | 'inappropriate' | 'spam' | 'harassment' | 'misinformation' | 'other';
  description?: string;
}

async function reportReel(supabase: any, request: ReportReelRequest) {
  const { data, error } = await supabase
    .from('reel_reports')
    .insert({
      reel_id: request.reelId,
      reporter_id: request.reporterId,
      reason: request.reason,
      description: request.description,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already reported this reel');
    }
    throw error;
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: ReportReelRequest = await req.json();

    // The service_role key is required to bypass RLS for this operation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const result = await reportReel(supabase, request);

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
