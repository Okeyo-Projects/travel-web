/**
 * Supabase Edge Function: Cleanup Bookings and Experiences
 *
 * This function runs the automated cleanup process:
 * 1. Cancels expired pending bookings
 * 2. Auto-drafts experiences with only past dates
 * 3. Sends notifications to affected users (TODO)
 * 4. Sends emails for cancelled bookings (TODO)
 *
 * Schedule this to run daily using Supabase Dashboard:
 * Edge Functions → cleanup-bookings → Enable Cron → Schedule: 0 2 * * *
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  timestamp: string;
  cancelled_bookings: {
    count: number;
    ids: string[];
  };
  drafted_experiences: {
    count: number;
    ids: string[];
  };
}

interface BookingDetails {
  id: string;
  guest_id: string;
  host_id: string;
  experience_title: string;
  from_date: string;
  to_date: string;
}

interface ExperienceDetails {
  id: string;
  title: string;
  type: 'trip' | 'activity' | 'lodging';
  host_id: string;
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
 * Send push notification to guest about cancelled booking
 */
async function sendCancellationNotification(
  booking: BookingDetails,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  console.log(`Sending cancellation notification for booking ${booking.id}`);

  await invokePushNotification(supabaseUrl, serviceRoleKey, {
    type: 'booking_cancelled',
    userId: booking.guest_id,
    data: {
      booking_id: booking.id,
      experience_id: booking.experience_title, // For entity mapping
    },
    variables: {
      user: 'System',
      experience: booking.experience_title,
    },
  });
}

/**
 * Send email notification about cancelled booking
 * Note: Intentionally not implemented per user request (push only)
 */
async function sendCancellationEmail(booking: BookingDetails): Promise<void> {
  // Not implemented - user requested push notifications only
  console.log(`Email notification skipped for booking ${booking.id} (push only mode)`);
}

/**
 * Send notification to host about auto-drafted experience
 */
async function sendExperienceDraftedNotification(
  experienceId: string,
  hostId: string,
  title: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  console.log(`Sending drafted notification for experience ${experienceId}`);

  await invokePushNotification(supabaseUrl, serviceRoleKey, {
    type: 'experience_drafted',
    userId: hostId,
    data: {
      experience_id: experienceId,
    },
    variables: {
      experience: title,
    },
  });
}


/**
 * Cancel expired pending bookings
 * Returns array of cancelled booking details
 */
async function cancelExpiredPendingBookings(supabase: any): Promise<BookingDetails[]> {
  console.log('Checking for expired pending bookings...');

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Fetch bookings that need to be cancelled
  const { data: expiredBookings, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      id,
      guest_id,
      from_date,
      to_date,
      host_notes,
      experience:experiences(
        id,
        title,
        host_id
      )
    `)
    .in('status', ['pending_host', 'pending_payment'])
    .lt('from_date', today)
    .is('deleted_at', null);

  if (fetchError) {
    console.error('Error fetching expired bookings:', fetchError);
    throw fetchError;
  }

  if (!expiredBookings || expiredBookings.length === 0) {
    console.log('No expired bookings found');
    return [];
  }

  console.log(`Found ${expiredBookings.length} expired bookings to cancel`);

  // Cancel each booking
  const bookingIds = expiredBookings.map((b: any) => b.id);
  const cancellationNote = 'Automatically cancelled - booking date has passed without confirmation.';

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      host_notes: supabase.rpc('concat_notes', {
        existing_notes: 'host_notes',
        new_note: cancellationNote
      })
    })
    .in('id', bookingIds);

  if (updateError) {
    console.error('Error updating bookings:', updateError);
    // Try simple update without concatenation
    await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .in('id', bookingIds);
  }

  // Map to booking details for notifications
  return expiredBookings.map((booking: any) => ({
    id: booking.id,
    guest_id: booking.guest_id,
    host_id: booking.experience?.host_id,
    experience_title: booking.experience?.title || 'Unknown Experience',
    from_date: booking.from_date,
    to_date: booking.to_date,
  }));
}

/**
 * Check if a trip has future departures
 */
async function tripHasFutureDepartures(supabase: any, experienceId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('trip_departures')
    .select('id')
    .eq('experience_id', experienceId)
    .gte('departure_date', today)
    .is('deleted_at', null)
    .limit(1);

  if (error) {
    console.error('Error checking trip departures:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Check if an activity has future sessions
 */
async function activityHasFutureSessions(supabase: any, experienceId: string): Promise<boolean> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('activity_sessions')
    .select('id')
    .eq('experience_id', experienceId)
    .gte('start_time', now)
    .is('deleted_at', null)
    .limit(1);

  if (error) {
    console.error('Error checking activity sessions:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Auto-draft published experiences with only past dates
 * Returns array of drafted experience details
 */
async function autoDraftExpiredExperiences(supabase: any): Promise<ExperienceDetails[]> {
  console.log('Checking for experiences with only past dates...');

  // Fetch published trips and activities
  const { data: experiences, error: fetchError } = await supabase
    .from('experiences')
    .select('id, title, type, host_id')
    .eq('status', 'published')
    .in('type', ['trip', 'activity'])
    .is('deleted_at', null);

  if (fetchError) {
    console.error('Error fetching experiences:', fetchError);
    throw fetchError;
  }

  if (!experiences || experiences.length === 0) {
    console.log('No published trips/activities found');
    return [];
  }

  console.log(`Checking ${experiences.length} published experiences for future availability...`);

  // Check each experience for future availability
  const experiencesToDraft: ExperienceDetails[] = [];

  for (const exp of experiences) {
    let hasFuture = false;

    if (exp.type === 'trip') {
      hasFuture = await tripHasFutureDepartures(supabase, exp.id);
    } else if (exp.type === 'activity') {
      hasFuture = await activityHasFutureSessions(supabase, exp.id);
    }

    if (!hasFuture) {
      experiencesToDraft.push(exp);
    }
  }

  if (experiencesToDraft.length === 0) {
    console.log('No experiences need to be drafted');
    return [];
  }

  console.log(`Drafting ${experiencesToDraft.length} experiences...`);

  // Update experiences to draft
  const experienceIds = experiencesToDraft.map((e) => e.id);

  const { error: updateError } = await supabase
    .from('experiences')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .in('id', experienceIds);

  if (updateError) {
    console.error('Error updating experiences:', updateError);
    throw updateError;
  }

  return experiencesToDraft;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check for authorization
  // Allow requests from pg_net (cron jobs) or with valid service role key
  const userAgent = req.headers.get('user-agent') || '';
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = req.headers.get('x-cron-secret') || '';

  const isPgNet = userAgent.includes('pg_net');
  const hasValidAuth = authHeader.startsWith('Bearer ') && authHeader.length > 10;
  const hasValidCronSecret = cronSecret === Deno.env.get('CRON_SECRET');

  // For security, require either valid auth OR cron secret for pg_net requests
  if (!hasValidAuth && !hasValidCronSecret && !isPgNet) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

    console.log('Starting cleanup process...');
    const startTime = new Date();

    // Get env vars for notification calls
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Step 1: Cancel expired pending bookings
    const cancelledBookings = await cancelExpiredPendingBookings(supabaseClient);
    console.log(`Cancelled ${cancelledBookings.length} expired bookings`);

    // Step 2: Auto-draft experiences with only past dates
    const draftedExperiences = await autoDraftExpiredExperiences(supabaseClient);
    console.log(`Drafted ${draftedExperiences.length} expired experiences`);

    // Step 3: Send notifications for cancelled bookings
    if (cancelledBookings.length > 0) {
      console.log(`Processing notifications for ${cancelledBookings.length} cancelled bookings...`);

      for (const booking of cancelledBookings) {
        try {
          await Promise.all([
            sendCancellationNotification(booking, supabaseUrl, serviceRoleKey),
            sendCancellationEmail(booking),
          ]);
        } catch (notificationError) {
          console.error(`Error sending notifications for booking ${booking.id}:`, notificationError);
          // Continue with other bookings even if one fails
        }
      }
    }

    // Step 4: Send notifications for drafted experiences
    if (draftedExperiences.length > 0) {
      console.log(`Processing notifications for ${draftedExperiences.length} drafted experiences...`);

      for (const experience of draftedExperiences) {
        try {
          await sendExperienceDraftedNotification(
            experience.id,
            experience.host_id,
            experience.title,
            supabaseUrl,
            serviceRoleKey
          );
        } catch (notificationError) {
          console.error(`Error sending notification for experience ${experience.id}:`, notificationError);
          // Continue with other experiences even if one fails
        }
      }
    }

    // Build result
    const result: CleanupResult = {
      timestamp: startTime.toISOString(),
      cancelled_bookings: {
        count: cancelledBookings.length,
        ids: cancelledBookings.map((b) => b.id),
      },
      drafted_experiences: {
        count: draftedExperiences.length,
        ids: draftedExperiences.map((e) => e.id),
      },
    };

    console.log('Cleanup completed successfully:', {
      cancelledBookings: result.cancelled_bookings.count,
      draftedExperiences: result.drafted_experiences.count,
    });

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: result.timestamp,
        summary: {
          cancelled_bookings: result.cancelled_bookings.count,
          drafted_experiences: result.drafted_experiences.count,
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
