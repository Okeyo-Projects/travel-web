/**
 * Supabase Edge Function: Send Trip Reminders
 *
 * This function runs daily to:
 * 1. Find confirmed bookings starting in exactly 24 hours (tomorrow)
 * 2. Send a push notification to the guest reminding them of their trip
 *
 * Schedule: 0 9 * * * (Daily at 9am UTC)
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

    console.log('Starting trip reminder check...');

    // Calculate target date (Tomorrow)
    // We want bookings where from_date is tomorrow.
    // Note: from_date is usually YYYY-MM-DD or timestamp. 
    // If timestamp, we need to range check. If date string, exact match.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`Looking for bookings starting on: ${tomorrowStr}`);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        guest_id,
        from_date,
        experience:experiences (
          id,
          title
        )
      `)
      .eq('status', 'confirmed')
      // Assuming from_date is stored as YYYY-MM-DD or we can match the day part
      // If from_date is timestamptz, we might need:
      // .gte('from_date', `${tomorrowStr}T00:00:00`)
      // .lt('from_date', `${tomorrowStr}T23:59:59`)
      // Let's assume it's a date column or we match the string prefix if ISO
      .eq('from_date', tomorrowStr);

    if (error) throw error;

    if (!bookings || bookings.length === 0) {
      console.log('No bookings found starting tomorrow.');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${bookings.length} bookings starting tomorrow.`);

    // Send notifications
    const results = await Promise.all(bookings.map(async (booking) => {
      try {
        // Use existing send-push-notification function
        // 'booking_reminder' type corresponds to "Upcoming Trip"
        const { data, error: invokeError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            type: 'booking_reminder',
            userId: booking.guest_id,
            data: { 
                booking_id: booking.id, 
                experience_id: booking.experience?.id 
            },
            variables: {
              experience: booking.experience?.title || 'your experience'
            }
          }
        });

        if (invokeError) {
            console.error(`Failed to send reminder for booking ${booking.id}:`, invokeError);
            return { id: booking.id, success: false, error: invokeError };
        }
        
        return { id: booking.id, success: true };

      } catch (err) {
        console.error(`Error processing booking ${booking.id}:`, err);
        return { id: booking.id, success: false, error: err };
      }
    }));

    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({
      success: true,
      summary: {
        found: bookings.length,
        sent: successCount
      },
      details: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending trip reminders:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

