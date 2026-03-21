-- =====================================================
-- ADD show_in_booking FIELD TO PROMOTIONS
-- =====================================================
-- This field controls whether a manual code promotion
-- should be displayed in the booking UI section.
-- Defaults to true for backward compatibility.
-- =====================================================

ALTER TABLE promotions
ADD COLUMN IF NOT EXISTS show_in_booking BOOLEAN DEFAULT true;

COMMENT ON COLUMN promotions.show_in_booking IS 'Whether this manual code promotion should be displayed in the booking UI. Set to false for email-only campaigns, private codes, etc.';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_promotions_show_in_booking ON promotions(show_in_booking) WHERE show_in_booking = true;
