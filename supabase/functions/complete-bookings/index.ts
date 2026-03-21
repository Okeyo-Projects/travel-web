/**
 * Supabase Edge Function: Complete Bookings and Create Review Requests
 *
 * This function runs daily to:
 * 1. Mark confirmed bookings as completed after their end date
 * 2. Automatically create review requests for completed bookings
 * 3. Send notifications to guests about review opportunities
 *
 * Schedule this to run daily using Supabase Dashboard:
 * Edge Functions → complete-bookings → Enable Cron → Schedule: 0 3 * * *
 * (Runs at 3:00 AM UTC daily)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompletedBooking {
  id: string;
  guest_id: string;
  host_id: string;
  experience_id: string;
  experience_title: string;
  from_date: string;
  to_date: string;
}

interface CompletionResult {
  timestamp: string;
  completed_bookings: {
    count: number;
    ids: string[];
  };
  review_requests_created: {
    count: number;
    ids: string[];
  };
}

/**
 * Helper to invoke the send-push-notification edge function
 */
async function invokePushNotification(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: {
    type: string;
    userId: string;
    data: Record<string, any>;
    variables: Record<string, string>;
  }
): Promise<void> {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Push notification failed:', errorText);
    throw new Error(`Push notification failed: ${response.status}`);
  }

  const result = await response.json();
  console.log('Push notification sent:', result);
}

/**
 * Send push notification to guest about review opportunity
 */
async function sendReviewRequestNotification(
  guestId: string,
  experienceTitle: string,
  bookingId: string,
  experienceId: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  console.log(`Sending review request notification to ${guestId} for "${experienceTitle}"`);

  await invokePushNotification(supabaseUrl, serviceRoleKey, {
    type: 'review_request',
    userId: guestId,
    data: {
      booking_id: bookingId,
      experience_id: experienceId,
      action: 'open_review_modal',
    },
    variables: {
      experience: experienceTitle,
    },
  });
}


/**
 * Complete bookings that have passed their end date
 */
async function completePastBookings(supabase: any): Promise<CompletedBooking[]> {
  console.log('Checking for bookings to complete...');

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Fetch confirmed bookings that have ended
  const { data: pastBookings, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      id,
      guest_id,
      from_date,
      to_date,
      host_id,
      experience:experiences(
        id,
        title
      )
    `)
    .eq('status', 'confirmed')
    .lt('to_date', today)
    .is('completed_at', null)
    .is('deleted_at', null);

  if (fetchError) {
    console.error('Error fetching past bookings:', fetchError);
    throw fetchError;
  }

  if (!pastBookings || pastBookings.length === 0) {
    console.log('No bookings to complete');
    return [];
  }

  console.log(`Found ${pastBookings.length} bookings to complete`);

  // Mark bookings as completed
  const bookingIds = pastBookings.map((b: any) => b.id);
  const completedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'completed',
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .in('id', bookingIds);

  if (updateError) {
    console.error('Error updating bookings:', updateError);
    throw updateError;
  }

  console.log(`Successfully marked ${pastBookings.length} bookings as completed`);

  // Map to booking details
  return pastBookings.map((booking: any) => ({
    id: booking.id,
    guest_id: booking.guest_id,
    host_id: booking.host_id,
    experience_id: booking.experience?.id,
    experience_title: booking.experience?.title || 'Unknown Experience',
    from_date: booking.from_date,
    to_date: booking.to_date,
  }));
}

/**
 * Get or create review requests for completed bookings
 * The database trigger should auto-create these, but this ensures no requests are missed
 */
async function ensureReviewRequestsCreated(
  supabase: any,
  completedBookings: CompletedBooking[],
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string[]> {
  if (completedBookings.length === 0) {
    return [];
  }

  console.log(`Ensuring review requests exist for ${completedBookings.length} bookings...`);

  const createdIds: string[] = [];

  for (const booking of completedBookings) {
    // Check if review request already exists
    const { data: existing } = await supabase
      .from('review_requests')
      .select('id')
      .eq('booking_id', booking.id)
      .single();

    if (existing) {
      console.log(`Review request already exists for booking ${booking.id}`);
      continue;
    }

    // Create review request
    const { data: created, error } = await supabase
      .from('review_requests')
      .insert({
        booking_id: booking.id,
        experience_id: booking.experience_id,
        guest_id: booking.guest_id,
        host_id: booking.host_id,
        status: 'pending',
        requested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Error creating review request for booking ${booking.id}:`, error);
      continue;
    }

    if (created) {
      createdIds.push(created.id);
      console.log(`Created review request ${created.id} for booking ${booking.id}`);

      // Send notification to guest
      try {
        await sendReviewRequestNotification(
          booking.guest_id,
          booking.experience_title,
          booking.id,
          booking.experience_id,
          supabaseUrl,
          serviceRoleKey
        );
      } catch (notificationError) {
        console.error(`Error sending notification for booking ${booking.id}:`, notificationError);
        // Continue even if notification fails
      }
    }
  }

  console.log(`Created ${createdIds.length} new review requests`);

  return createdIds;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Starting booking completion process...');
    const startTime = new Date();

    // Get env vars for notification calls
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Step 1: Complete past bookings
    const completedBookings = await completePastBookings(supabaseClient);
    console.log(`Completed ${completedBookings.length} bookings`);

    // Step 2: Ensure review requests are created
    // (The database trigger should handle this, but we double-check)
    const reviewRequestIds = await ensureReviewRequestsCreated(
      supabaseClient,
      completedBookings,
      supabaseUrl,
      serviceRoleKey
    );

    // Build result
    const result: CompletionResult = {
      timestamp: startTime.toISOString(),
      completed_bookings: {
        count: completedBookings.length,
        ids: completedBookings.map((b) => b.id),
      },
      review_requests_created: {
        count: reviewRequestIds.length,
        ids: reviewRequestIds,
      },
    };

    console.log('Booking completion process finished successfully:', {
      completedBookings: result.completed_bookings.count,
      reviewRequestsCreated: result.review_requests_created.count,
    });

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: result.timestamp,
        summary: {
          completed_bookings: result.completed_bookings.count,
          review_requests_created: result.review_requests_created.count,
        },
        details: result,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Function error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});
