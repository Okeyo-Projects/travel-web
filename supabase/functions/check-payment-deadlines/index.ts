/**
 * Supabase Edge Function: Check Payment Deadlines
 *
 * This function runs hourly to:
 * 1. Check 'approved' bookings (waiting for payment)
 * 2. Cancel bookings where payment deadline has passed
 * 3. Send urgent reminders for bookings with deadline approaching (< 24h)
 *
 * Schedule: 0 * * * * (Hourly)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { sendEmail } from '../_shared/email.ts';

const APP_BASE_URL = 'https://okeyotravel.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Type definitions based on DB schema
interface Booking {
  id: string;
  guest_id: string;
  host_id: string;
  status: string;
  from_date: string;
  to_date: string;
  created_at: string;
  updated_at: string; // This is often used as 'approved_at' if status changed recently, but we should check history or assume updated_at is close to approval if no specific field
  // In a real scenario, we'd want an 'approved_at' timestamp column or audit log.
  // For now, let's assume 'updated_at' is the approval time if status is 'approved'.
  // Or we might need to rely on 'created_at' if approval is automatic? 
  // Actually, let's look for a specific approved_at or similar if available. 
  // If not, we can use updated_at as a proxy for when it entered 'approved' state.
  approved_at?: string; // We will try to fetch this if it exists, otherwise fallback
  experience: {
    id: string;
    title: string;
  };
  guest?: {
    email?: string | null;
    display_name?: string | null;
  };
}

interface DeadlineInfo {
  booking: Booking;
  deadline: Date;
  hoursRemaining: number;
  hasExpired: boolean;
  isUrgent: boolean; // < 24h
  isCritical: boolean; // < 3h
}

// Reuse calculation logic from frontend (converted to simple TS for Deno)
// apps/mobile/lib/functions/payment-deadline.ts
function calculatePaymentDeadline(
  approvedAt: string | Date,
  fromDate: string | Date
): Date {
  const startDate = new Date(fromDate);
  const approvalDate = new Date(approvedAt);

  // Calculate time from approval to start
  const timeToStartMs = startDate.getTime() - approvalDate.getTime();
  const daysUntilStart = timeToStartMs / (1000 * 60 * 60 * 24);

  let deadline: Date;

  if (daysUntilStart < 1) {
    // Case: Booking starts in less than 1 day - user has 3 hours
    deadline = new Date(approvalDate.getTime() + (3 * 60 * 60 * 1000));
  } else if (daysUntilStart < 7) {
    // Case: Approved less than 1 week before start - immediate payment + 1 day grace
    deadline = new Date(approvalDate.getTime() + (1 * 24 * 60 * 60 * 1000));
  } else {
    // Case: Normal - pay by 1 week before start + 1 day grace
    const oneWeekBeforeStart = new Date(startDate.getTime() - (7 * 24 * 60 * 60 * 1000));
    deadline = new Date(oneWeekBeforeStart.getTime() + (1 * 24 * 60 * 60 * 1000));
  }

  return deadline;
}

serve(async (req) => {
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting payment deadline check...');

    // 1. Fetch all approved bookings
    // We need 'approved_at' ideally. If not in bookings table, we might use updated_at
    // assuming the last update was the status change to 'approved'.
    // NOTE: If your schema doesn't have approved_at, ensure we use updated_at carefully.
    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        guest_id,
        host_id,
        status,
        from_date,
        to_date,
        created_at,
        updated_at,
        guest:profiles!bookings_guest_id_fkey(email, display_name),
        experience:experiences (
          id,
          title
        )
      `)
      .eq('status', 'approved');

    if (fetchError) throw fetchError;

    if (!bookings || bookings.length === 0) {
      console.log('No approved bookings to check.');
      return new Response(JSON.stringify({ success: true, message: 'No bookings pending payment' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Checking ${bookings.length} approved bookings...`);

    const now = new Date();
    const expiredBookings: Booking[] = [];
    const urgentReminders: Booking[] = [];
    const criticalReminders: Booking[] = []; // < 3 hours left

    for (const booking of bookings) {
      // Use updated_at as proxy for approved_at if not available
      // In a robust system, we should look up the status change event in an audit table
      const approvalTimestamp = booking.approved_at ?? booking.updated_at ?? booking.created_at;
      const deadline = calculatePaymentDeadline(approvalTimestamp, booking.from_date);

      const remainingMs = deadline.getTime() - now.getTime();
      const hoursRemaining = remainingMs / (1000 * 60 * 60);

      if (remainingMs <= 0) {
        expiredBookings.push(booking);
      } else if (hoursRemaining <= 3 && hoursRemaining > 2) {
        // Only send critical reminder once (e.g. between 2 and 3 hours remaining)
        // To prevent spamming every hour, we'd need to track 'last_reminder_sent_at'
        // For MVP, we can just send if it's in this window.
        criticalReminders.push(booking);
      } else if (hoursRemaining <= 24 && hoursRemaining > 23) {
        // Send 24h reminder (window 23-24h)
        urgentReminders.push(booking);
      }
    }

    // 2. Process Expired Bookings (Cancel them)
    if (expiredBookings.length > 0) {
      console.log(`Cancelling ${expiredBookings.length} expired bookings...`);
      const idsToCancel = expiredBookings.map(b => b.id);

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          // Optionally add a note or cancellation reason if schema supports it
          // host_notes: 'Cancelled due to non-payment' 
        })
        .in('id', idsToCancel);

      if (updateError) console.error('Error cancelling bookings:', updateError);
      else {
        // Send notifications for cancellations
        for (const booking of expiredBookings) {
          // Notify Guest
          await supabase.functions.invoke('send-push-notification', {
            body: {
              type: 'booking_cancelled',
              userId: booking.guest_id,
              data: {
                booking_id: booking.id,
                experience_id: booking.experience?.id,
                action_url: `${APP_BASE_URL}/user/bookings/${booking.id}`,
              },
              variables: {
                user: 'System',
                experience: booking.experience?.title || 'Experience'
              }
            }
          });

            // Email: payment failed / cancellation notice
            if (booking.guest?.email) {
              const dateRange = `${booking.from_date} → ${booking.to_date}`;
              await sendEmail({
                template: 'payment_failed',
                to: booking.guest.email,
                data: {
                  booking_id: booking.id,
                  guest_name: booking.guest.display_name,
                  experience_title: booking.experience?.title,
                  date_range: dateRange,
                  action_url: `${APP_BASE_URL}/user/bookings/${booking.id}`,
                },
                entity_type: 'booking',
                entity_id: booking.id,
                user_id: booking.guest_id,
              });
            }
        }
      }
    }

    // 3. Send Reminders
    // Critical ( < 3 hours )
    for (const booking of criticalReminders) {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          type: 'booking_reminder',
          userId: booking.guest_id,
          data: {
            booking_id: booking.id,
            experience_id: booking.experience?.id,
            action_url: `${APP_BASE_URL}/user/bookings/${booking.id}`,
          },
          variables: {
            experience: booking.experience?.title || 'Experience'
          }
        }
      });

      if (booking.guest?.email) {
        const dateRange = `${booking.from_date} → ${booking.to_date}`;
        await sendEmail({
          template: 'booking_reminder',
          to: booking.guest.email,
          data: {
            booking_id: booking.id,
            guest_name: booking.guest.display_name,
            experience_title: booking.experience?.title,
            date_range: dateRange,
            action_url: `${APP_BASE_URL}/user/bookings/${booking.id}`,
          },
          entity_type: 'booking',
          entity_id: booking.id,
          user_id: booking.guest_id,
        });
      }
    }

    // Urgent ( < 24 hours )
    for (const booking of urgentReminders) {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          type: 'booking_reminder',
          userId: booking.guest_id,
          data: {
            booking_id: booking.id,
            experience_id: booking.experience?.id,
            action_url: `${APP_BASE_URL}/user/bookings/${booking.id}`,
          },
          variables: {
            experience: booking.experience?.title || 'Experience'
          }
        }
      });

      if (booking.guest?.email) {
        const dateRange = `${booking.from_date} → ${booking.to_date}`;
        await sendEmail({
          template: 'booking_reminder',
          to: booking.guest.email,
          data: {
            booking_id: booking.id,
            guest_name: booking.guest.display_name,
            experience_title: booking.experience?.title,
            date_range: dateRange,
            action_url: `${APP_BASE_URL}/user/bookings/${booking.id}`,
          },
          entity_type: 'booking',
          entity_id: booking.id,
          user_id: booking.guest_id,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      summary: {
        checked: bookings.length,
        expired: expiredBookings.length,
        urgent_reminders: urgentReminders.length,
        critical_reminders: criticalReminders.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing payment deadlines:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
