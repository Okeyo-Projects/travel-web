/**
 * Supabase Edge Function: Send Review Follow-up
 *
 * This function runs daily to:
 * 1. Find pending review requests created 3 days ago
 * 2. Send a reminder push notification to the guest
 *
 * Schedule: 0 10 * * * (Daily at 10am UTC)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting review follow-up check...');

    // Calculate target date: 3 days ago
    // We look for requests created on this specific day to avoid spamming
    // e.g. created between 3 days ago 00:00 and 23:59
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateStr = threeDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`Looking for review requests created on: ${dateStr}`);

    // Check pending requests created approx 3 days ago
    // We use gte/lt to match the full day based on 'requested_at' timestamp
    const { data: requests, error } = await supabase
      .from('review_requests')
      .select(`
        id,
        guest_id,
        experience_id,
        experience:experiences(title)
      `)
      .eq('status', 'pending')
      .gte('requested_at', `${dateStr}T00:00:00`)
      .lt('requested_at', `${dateStr}T23:59:59`);

    if (error) throw error;

    if (!requests || requests.length === 0) {
      console.log('No pending review requests found for that date.');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${requests.length} pending requests to follow up.`);

    // Send notifications
    const results = await Promise.all(requests.map(async (req) => {
      try {
        const { error: invokeError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            type: 'review_request', // Re-using the review request type but maybe with a slight variation if supported
            userId: req.guest_id,
            data: { 
                review_request_id: req.id,
                experience_id: req.experience_id,
                action: 'open_review_modal'
            },
            variables: {
              experience: req.experience?.title || 'Experience'
            }
          }
        });

        if (invokeError) {
             console.error(`Failed to send follow-up for request ${req.id}:`, invokeError);
             return { id: req.id, success: false, error: invokeError };
        }
        return { id: req.id, success: true };

      } catch (err) {
        console.error(`Error processing request ${req.id}:`, err);
        return { id: req.id, success: false, error: err };
      }
    }));

    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({
      success: true,
      summary: {
        found: requests.length,
        sent: successCount
      },
      details: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending review follow-ups:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

