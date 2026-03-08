-- Seed notifications for testing
-- Host ID: 8aa8ce71-e112-4054-9d43-c12967d4953d

-- Insert test notifications
INSERT INTO notifications (user_id, kind, title, body, entity_type, entity_id, action_url, metadata)
VALUES
  -- Booking notifications
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'booking_request',
    'New Booking Request',
    'You have a new booking request for your Riad experience in Marrakech',
    'booking',
    'b1234567-1234-1234-1234-123456789012',
    '/host/bookings/b1234567-1234-1234-1234-123456789012',
    '{"guest_name": "Sarah Johnson", "check_in": "2025-12-20", "check_out": "2025-12-25"}'::jsonb
  ),
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'booking_confirmed',
    'Booking Confirmed',
    'Your booking for Desert Safari has been confirmed and paid',
    'booking',
    'b2234567-1234-1234-1234-123456789012',
    '/host/bookings/b2234567-1234-1234-1234-123456789012',
    '{"guest_name": "Ahmed El Fassi", "total_amount": 15000, "currency": "MAD"}'::jsonb
  ),
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'booking_cancelled',
    'Booking Cancelled',
    'A guest has cancelled their booking for Atlas Mountains Trek',
    'booking',
    'b3234567-1234-1234-1234-123456789012',
    '/host/bookings/b3234567-1234-1234-1234-123456789012',
    '{"guest_name": "Marie Dubois", "refund_amount": 8000}'::jsonb
  ),

  -- Payment notifications
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'payment_succeeded',
    'Payment Received',
    'You have received a payment of 12,500 MAD for your Coastal Retreat experience',
    'booking',
    'b4234567-1234-1234-1234-123456789012',
    '/host/bookings/b4234567-1234-1234-1234-123456789012',
    '{"amount": 12500, "currency": "MAD", "booking_id": "b4234567-1234-1234-1234-123456789012"}'::jsonb
  ),

  -- Review notifications
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'new_review',
    'New 5-Star Review!',
    'John Smith left you a 5-star review: "Amazing experience! The host was incredibly welcoming and the accommodation exceeded expectations."',
    'experience',
    'e1234567-1234-1234-1234-123456789012',
    '/experience/e1234567-1234-1234-1234-123456789012',
    '{"rating": 5, "reviewer_name": "John Smith", "reviewer_avatar": null}'::jsonb
  ),
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'new_review',
    'New Review',
    'Emma Wilson left you a 4-star review: "Great location and very clean. Would recommend!"',
    'experience',
    'e2234567-1234-1234-1234-123456789012',
    '/experience/e2234567-1234-1234-1234-123456789012',
    '{"rating": 4, "reviewer_name": "Emma Wilson"}'::jsonb
  ),

  -- Message notifications
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'new_message',
    'New Message',
    'You have a new message from Fatima about their upcoming stay',
    'booking',
    'b5234567-1234-1234-1234-123456789012',
    '/host/bookings/b5234567-1234-1234-1234-123456789012',
    '{"sender_name": "Fatima Bennani", "preview": "Hi, I wanted to ask about..."}'::jsonb
  ),
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'new_message',
    'New Message',
    'Carlos Rodriguez sent you a message about check-in time',
    'booking',
    'b6234567-1234-1234-1234-123456789012',
    '/host/bookings/b6234567-1234-1234-1234-123456789012',
    '{"sender_name": "Carlos Rodriguez", "preview": "What time can we check in?"}'::jsonb
  ),

  -- Experience published
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'experience_published',
    'Experience Published!',
    'Your experience "Sunset Camel Ride in Sahara" is now live and available for bookings',
    'experience',
    'e3234567-1234-1234-1234-123456789012',
    '/experience/e3234567-1234-1234-1234-123456789012',
    '{"experience_name": "Sunset Camel Ride in Sahara"}'::jsonb
  ),

  -- Social notifications
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'follow',
    'New Follower',
    'Sophia Anderson started following you',
    null,
    null,
    null,
    '{"follower_name": "Sophia Anderson", "follower_id": "u1234567-1234-1234-1234-123456789012"}'::jsonb
  ),
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'like',
    'Someone liked your experience',
    'Mohammed Alami liked your "Traditional Moroccan Cooking Class" experience',
    'experience',
    'e4234567-1234-1234-1234-123456789012',
    '/experience/e4234567-1234-1234-1234-123456789012',
    '{"liker_name": "Mohammed Alami"}'::jsonb
  ),

  -- System notifications
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'system',
    'Profile Verification Complete',
    'Your host profile has been verified! You can now receive bookings.',
    null,
    null,
    '/host/profile',
    '{"verification_status": "approved"}'::jsonb
  ),
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'system',
    'Weekly Summary',
    'You had 15 views and 3 new bookings this week. Total earnings: 45,000 MAD',
    null,
    null,
    '/host/reports',
    '{"views": 15, "bookings": 3, "earnings": 45000, "period": "week"}'::jsonb
  ),

  -- Older read notification (to test read/unread states)
  (
    '8aa8ce71-e112-4054-9d43-c12967d4953d',
    'booking_confirmed',
    'Booking Confirmed',
    'Your Essaouira Beach House booking has been confirmed',
    'booking',
    'b7234567-1234-1234-1234-123456789012',
    '/host/bookings/b7234567-1234-1234-1234-123456789012',
    '{"guest_name": "Lisa Chen"}'::jsonb
  );

-- Mark the last notification as read (older notification)
UPDATE notifications
SET read_at = NOW() - INTERVAL '2 hours',
    clicked_at = NOW() - INTERVAL '1 hour'
WHERE user_id = '8aa8ce71-e112-4054-9d43-c12967d4953d'
  AND kind = 'booking_confirmed'
  AND body LIKE '%Essaouira Beach House%';

-- Update timestamps for variety (some older, some newer)
UPDATE notifications
SET created_at = NOW() - INTERVAL '5 minutes'
WHERE user_id = '8aa8ce71-e112-4054-9d43-c12967d4953d'
  AND kind = 'booking_request';

UPDATE notifications
SET created_at = NOW() - INTERVAL '1 hour'
WHERE user_id = '8aa8ce71-e112-4054-9d43-c12967d4953d'
  AND kind = 'new_review'
  AND body LIKE '%John Smith%';

UPDATE notifications
SET created_at = NOW() - INTERVAL '3 hours'
WHERE user_id = '8aa8ce71-e112-4054-9d43-c12967d4953d'
  AND kind = 'payment_succeeded';

UPDATE notifications
SET created_at = NOW() - INTERVAL '1 day'
WHERE user_id = '8aa8ce71-e112-4054-9d43-c12967d4953d'
  AND kind = 'system'
  AND title = 'Weekly Summary';

UPDATE notifications
SET created_at = NOW() - INTERVAL '3 days'
WHERE user_id = '8aa8ce71-e112-4054-9d43-c12967d4953d'
  AND kind = 'booking_confirmed'
  AND body LIKE '%Essaouira Beach House%';

-- Display summary
SELECT
  kind,
  COUNT(*) as count,
  SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread
FROM notifications
WHERE user_id = '8aa8ce71-e112-4054-9d43-c12967d4953d'
GROUP BY kind
ORDER BY count DESC;

-- Show all notifications for the host
SELECT
  kind,
  title,
  body,
  read_at IS NULL as is_unread,
  created_at
FROM notifications
WHERE user_id = '8aa8ce71-e112-4054-9d43-c12967d4953d'
ORDER BY created_at DESC;
