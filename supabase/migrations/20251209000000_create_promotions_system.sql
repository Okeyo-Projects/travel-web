-- =====================================================
-- PROMOTIONS SYSTEM
-- Supports: First Booking, Promo Codes, Loyalty Rewards, Referrals
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE promotion_type AS ENUM (
  'first_booking',
  'promo_code',
  'loyalty_reward',
  'referral'
);

CREATE TYPE promotion_scope AS ENUM (
  'global',              -- Available to all users/experiences
  'host_specific',       -- Only for specific host's experiences
  'experience_specific'  -- Only for specific experiences
);

CREATE TYPE discount_type AS ENUM (
  'percentage',          -- 20 = 20% off
  'fixed_amount'         -- 500 = $5 off (in cents)
);

CREATE TYPE promotion_status AS ENUM (
  'draft',
  'active',
  'paused',
  'expired',
  'archived'
);

CREATE TYPE usage_limit_type AS ENUM (
  'unlimited',           -- No limit
  'once_total',          -- Can only be used once across all users
  'once_per_user',       -- Each user can use once
  'limited_total',       -- Limited number of total uses
  'limited_per_user'     -- Each user can use X times
);

CREATE TYPE promotion_usage_status AS ENUM (
  'applied',             -- Successfully applied to booking
  'refunded',            -- Booking was refunded
  'expired'              -- Promotion expired before use
);

CREATE TYPE referral_status AS ENUM (
  'pending',             -- Referred user hasn't booked yet
  'completed',           -- Referee made first booking
  'rewarded',            -- Both parties received rewards
  'expired'              -- Referral link expired
);

-- =====================================================
-- MAIN PROMOTIONS TABLE
-- =====================================================

CREATE TABLE promotions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type promotion_type NOT NULL,
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  internal_notes TEXT,                        -- For admin reference
  
  -- Promo Code (for promo_code type)
  code TEXT UNIQUE,                           -- e.g., "SUMMER2024", "VFS411"
  is_case_sensitive BOOLEAN DEFAULT false,
  
  -- Scope
  scope promotion_scope NOT NULL DEFAULT 'global',
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
  applicable_experience_ids UUID[],           -- NULL = all experiences
  applicable_experience_types TEXT[],         -- ['trip', 'lodging'] or NULL for all
  
  -- Discount Configuration
  discount_type discount_type NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,     -- 20.00 for 20% or 500 for $5
  max_discount_amount_cents INT,              -- Cap for percentage discounts
  min_booking_amount_cents INT,               -- Minimum booking amount to qualify
  
  -- Loyalty Reward Specific
  required_bookings_count INT,                -- For loyalty: need X bookings to earn
  loyalty_reward_code_prefix TEXT,            -- e.g., "LOYAL-" for generated codes
  loyalty_code_validity_days INT,             -- Generated code valid for X days
  
  -- Referral Specific
  referrer_discount_type discount_type,
  referrer_discount_value DECIMAL(10, 2),
  referrer_max_discount_cents INT,
  referee_discount_type discount_type,
  referee_discount_value DECIMAL(10, 2),
  referee_max_discount_cents INT,
  
  -- Time Validity
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,                    -- NULL = no expiration
  
  -- Usage Limits
  usage_limit_type usage_limit_type NOT NULL DEFAULT 'unlimited',
  total_usage_limit INT,                      -- For limited_total
  per_user_usage_limit INT,                   -- For limited_per_user
  
  -- Current Usage (denormalized for performance)
  current_total_usage INT DEFAULT 0,
  total_discount_given_cents BIGINT DEFAULT 0,
  
  -- Rules & Restrictions
  first_booking_only BOOLEAN DEFAULT false,   -- Only for users' first booking
  min_days_before_experience INT,             -- Must book X days in advance
  max_days_before_experience INT,             -- Must book within X days
  booking_date_from DATE,                     -- Experience must be on/after this date
  booking_date_until DATE,                    -- Experience must be on/before this date
  min_nights INT,                             -- For lodging minimum nights
  
  -- Stacking & Priority
  is_stackable BOOLEAN DEFAULT false,         -- Can combine with other promotions
  priority INT DEFAULT 0,                     -- Higher priority applied first
  
  -- Auto-apply
  auto_apply BOOLEAN DEFAULT false,           -- Apply automatically if conditions met
  show_badge BOOLEAN DEFAULT false,           -- Show promotion badge on listings
  badge_text TEXT,                            -- Custom badge text
  
  -- Status
  status promotion_status NOT NULL DEFAULT 'active',
  
  -- Metadata
  created_by_user_id UUID,
  created_by_host_id UUID REFERENCES hosts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_discount_value CHECK (discount_value > 0),
  CONSTRAINT valid_max_discount CHECK (max_discount_amount_cents IS NULL OR max_discount_amount_cents > 0),
  CONSTRAINT valid_min_booking CHECK (min_booking_amount_cents IS NULL OR min_booking_amount_cents > 0),
  CONSTRAINT promo_code_requires_code CHECK (type != 'promo_code' OR code IS NOT NULL),
  CONSTRAINT loyalty_requires_bookings_count CHECK (type != 'loyalty_reward' OR required_bookings_count IS NOT NULL),
  CONSTRAINT host_specific_requires_host CHECK (scope != 'host_specific' OR host_id IS NOT NULL),
  CONSTRAINT valid_date_range CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT valid_usage_limits CHECK (
    (usage_limit_type = 'unlimited') OR
    (usage_limit_type = 'once_total') OR
    (usage_limit_type = 'once_per_user') OR
    (usage_limit_type = 'limited_total' AND total_usage_limit IS NOT NULL) OR
    (usage_limit_type = 'limited_per_user' AND per_user_usage_limit IS NOT NULL)
  )
);

-- =====================================================
-- PROMOTION USAGE TRACKING
-- =====================================================

CREATE TABLE promotion_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Promo Code Used
  code_used TEXT,                             -- The actual code entered (if promo_code type)
  
  -- Financial Details
  original_amount_cents INT NOT NULL,
  discount_amount_cents INT NOT NULL,
  final_amount_cents INT NOT NULL,
  
  -- Context
  experience_id UUID REFERENCES experiences(id),
  host_id UUID REFERENCES hosts(id),
  
  -- Status
  status promotion_usage_status NOT NULL DEFAULT 'applied',
  
  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  refunded_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_amounts CHECK (
    discount_amount_cents >= 0 AND
    final_amount_cents >= 0 AND
    original_amount_cents >= final_amount_cents
  )
);

-- =====================================================
-- USER REFERRALS
-- =====================================================

CREATE TABLE user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Promotion Reference
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  
  -- Users
  referrer_user_id UUID NOT NULL,
  referee_user_id UUID,
  
  -- Referral Code (unique per referrer)
  referral_code TEXT NOT NULL UNIQUE,         -- e.g., "REF-USER123"
  
  -- Status
  status referral_status NOT NULL DEFAULT 'pending',
  
  -- Timestamps
  referred_at TIMESTAMPTZ DEFAULT NOW(),
  referee_signed_up_at TIMESTAMPTZ,
  first_booking_completed_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Rewards Given
  referrer_reward_amount_cents INT,
  referee_discount_amount_cents INT,
  
  -- Booking Reference
  referee_first_booking_id UUID REFERENCES bookings(id),
  referrer_reward_booking_id UUID REFERENCES bookings(id),
  
  -- Metadata
  referee_email TEXT,                         -- Store email before signup
  
  CONSTRAINT valid_referral_code CHECK (length(referral_code) >= 6)
);

-- =====================================================
-- GENERATED PROMO CODES (for Loyalty Rewards)
-- =====================================================

CREATE TABLE generated_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Code
  code TEXT NOT NULL UNIQUE,                  -- e.g., "LOYAL-USER123-1"
  
  -- Status
  is_used BOOLEAN DEFAULT false,
  is_expired BOOLEAN DEFAULT false,
  
  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  
  -- Usage
  booking_id UUID REFERENCES bookings(id),
  
  CONSTRAINT valid_generated_code CHECK (length(code) >= 8)
);

-- =====================================================
-- USER PROMOTION ELIGIBILITY CACHE
-- =====================================================
-- This table helps quickly check if a user is eligible for auto-apply promotions

CREATE TABLE user_promotion_eligibility (
  user_id UUID NOT NULL,
  
  -- First Booking Check
  has_completed_booking BOOLEAN DEFAULT false,
  first_booking_at TIMESTAMPTZ,
  total_bookings_count INT DEFAULT 0,
  
  -- Last Updated
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Promotions indexes
CREATE INDEX idx_promotions_type ON promotions(type);
CREATE INDEX idx_promotions_code ON promotions(code) WHERE code IS NOT NULL;
CREATE INDEX idx_promotions_status ON promotions(status);
CREATE INDEX idx_promotions_host_id ON promotions(host_id) WHERE host_id IS NOT NULL;
CREATE INDEX idx_promotions_valid_dates ON promotions(valid_from, valid_until);
CREATE INDEX idx_promotions_auto_apply ON promotions(auto_apply) WHERE auto_apply = true;
CREATE INDEX idx_promotions_first_booking ON promotions(first_booking_only) WHERE first_booking_only = true;

-- Promotion usage indexes
CREATE INDEX idx_promotion_usages_promotion_id ON promotion_usages(promotion_id);
CREATE INDEX idx_promotion_usages_user_id ON promotion_usages(user_id);
CREATE INDEX idx_promotion_usages_booking_id ON promotion_usages(booking_id);
CREATE INDEX idx_promotion_usages_status ON promotion_usages(status);
CREATE INDEX idx_promotion_usages_applied_at ON promotion_usages(applied_at);

-- Referrals indexes
CREATE INDEX idx_user_referrals_referrer ON user_referrals(referrer_user_id);
CREATE INDEX idx_user_referrals_referee ON user_referrals(referee_user_id);
CREATE INDEX idx_user_referrals_code ON user_referrals(referral_code);
CREATE INDEX idx_user_referrals_status ON user_referrals(status);

-- Generated codes indexes
CREATE INDEX idx_generated_codes_user_id ON generated_promo_codes(user_id);
CREATE INDEX idx_generated_codes_code ON generated_promo_codes(code);
CREATE INDEX idx_generated_codes_used ON generated_promo_codes(is_used, is_expired);
CREATE INDEX idx_generated_codes_promotion_id ON generated_promo_codes(promotion_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update promotion usage count
CREATE OR REPLACE FUNCTION update_promotion_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'applied' THEN
    UPDATE promotions
    SET 
      current_total_usage = current_total_usage + 1,
      total_discount_given_cents = total_discount_given_cents + NEW.discount_amount_cents,
      updated_at = NOW()
    WHERE id = NEW.promotion_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'applied' AND NEW.status = 'refunded' THEN
    UPDATE promotions
    SET 
      current_total_usage = GREATEST(0, current_total_usage - 1),
      total_discount_given_cents = GREATEST(0, total_discount_given_cents - NEW.discount_amount_cents),
      updated_at = NOW()
    WHERE id = NEW.promotion_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_promotion_usage_count
  AFTER INSERT OR UPDATE ON promotion_usages
  FOR EACH ROW
  EXECUTE FUNCTION update_promotion_usage_count();

-- Function to update user eligibility cache
CREATE OR REPLACE FUNCTION update_user_promotion_eligibility()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    INSERT INTO user_promotion_eligibility (user_id, has_completed_booking, first_booking_at, total_bookings_count)
    VALUES (
      NEW.guest_id,
      true,
      NOW(),
      1
    )
    ON CONFLICT (user_id) DO UPDATE SET
      total_bookings_count = user_promotion_eligibility.total_bookings_count + 1,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_promotion_eligibility
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_promotion_eligibility();

-- Function to check if promotion is valid and available
CREATE OR REPLACE FUNCTION is_promotion_available(
  p_promotion_id UUID,
  p_user_id UUID,
  p_booking_amount_cents INT,
  p_experience_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_promotion RECORD;
  v_user_usage_count INT;
  v_user_bookings_count INT;
BEGIN
  -- Get promotion details
  SELECT * INTO v_promotion
  FROM promotions
  WHERE id = p_promotion_id
    AND status = 'active'
    AND (valid_until IS NULL OR valid_until > NOW())
    AND valid_from <= NOW();
  
  -- Promotion doesn't exist or is inactive
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check minimum booking amount
  IF v_promotion.min_booking_amount_cents IS NOT NULL 
     AND p_booking_amount_cents < v_promotion.min_booking_amount_cents THEN
    RETURN FALSE;
  END IF;
  
  -- Check experience eligibility
  IF v_promotion.applicable_experience_ids IS NOT NULL 
     AND p_experience_id IS NOT NULL
     AND NOT (p_experience_id = ANY(v_promotion.applicable_experience_ids)) THEN
    RETURN FALSE;
  END IF;
  
  -- Check usage limits
  CASE v_promotion.usage_limit_type
    WHEN 'once_total' THEN
      IF v_promotion.current_total_usage >= 1 THEN
        RETURN FALSE;
      END IF;
    
    WHEN 'limited_total' THEN
      IF v_promotion.current_total_usage >= v_promotion.total_usage_limit THEN
        RETURN FALSE;
      END IF;
    
    WHEN 'once_per_user', 'limited_per_user' THEN
      SELECT COUNT(*) INTO v_user_usage_count
      FROM promotion_usages
      WHERE promotion_id = p_promotion_id
        AND user_id = p_user_id
        AND status = 'applied';
      
      IF v_promotion.usage_limit_type = 'once_per_user' AND v_user_usage_count >= 1 THEN
        RETURN FALSE;
      END IF;
      
      IF v_promotion.usage_limit_type = 'limited_per_user' 
         AND v_user_usage_count >= v_promotion.per_user_usage_limit THEN
        RETURN FALSE;
      END IF;
  END CASE;
  
  -- Check first booking only restriction
  IF v_promotion.first_booking_only THEN
    SELECT COALESCE(total_bookings_count, 0) INTO v_user_bookings_count
    FROM user_promotion_eligibility
    WHERE user_id = p_user_id;
    
    IF v_user_bookings_count > 0 THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate discount amount
CREATE OR REPLACE FUNCTION calculate_discount_amount(
  p_promotion_id UUID,
  p_booking_amount_cents INT
)
RETURNS INT AS $$
DECLARE
  v_promotion RECORD;
  v_discount_cents INT;
BEGIN
  SELECT * INTO v_promotion
  FROM promotions
  WHERE id = p_promotion_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calculate based on type
  IF v_promotion.discount_type = 'percentage' THEN
    v_discount_cents := FLOOR(p_booking_amount_cents * v_promotion.discount_value / 100);
    
    -- Apply max discount cap if set
    IF v_promotion.max_discount_amount_cents IS NOT NULL THEN
      v_discount_cents := LEAST(v_discount_cents, v_promotion.max_discount_amount_cents);
    END IF;
  ELSE
    -- Fixed amount
    v_discount_cents := v_promotion.discount_value::INT;
  END IF;
  
  -- Ensure discount doesn't exceed booking amount
  v_discount_cents := LEAST(v_discount_cents, p_booking_amount_cents);
  
  RETURN v_discount_cents;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promotion_eligibility ENABLE ROW LEVEL SECURITY;

-- Promotions: Public read for active promotions, admin/host write
CREATE POLICY "Anyone can view active promotions"
  ON promotions FOR SELECT
  USING (status = 'active' AND (valid_until IS NULL OR valid_until > NOW()));

CREATE POLICY "Hosts can manage their own promotions"
  ON promotions FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    host_id IN (
      SELECT h.id 
      FROM hosts h
      INNER JOIN profiles p ON h.owner_id = p.id
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    host_id IN (
      SELECT h.id 
      FROM hosts h
      INNER JOIN profiles p ON h.owner_id = p.id
      WHERE p.id = auth.uid()
    )
  );

-- Promotion usages: Users can view their own
CREATE POLICY "Users can view their own promotion usages"
  ON promotion_usages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert promotion usages"
  ON promotion_usages FOR INSERT
  WITH CHECK (true);

-- Referrals: Users can view referrals they're involved in
CREATE POLICY "Users can view their referrals"
  ON user_referrals FOR SELECT
  USING (referrer_user_id = auth.uid() OR referee_user_id = auth.uid());

CREATE POLICY "Users can create referrals"
  ON user_referrals FOR INSERT
  WITH CHECK (referrer_user_id = auth.uid());

-- Generated codes: Users can view their own codes
CREATE POLICY "Users can view their own generated codes"
  ON generated_promo_codes FOR SELECT
  USING (user_id = auth.uid());

-- Eligibility: Users can view their own eligibility
CREATE POLICY "Users can view their own eligibility"
  ON user_promotion_eligibility FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Initialize eligibility cache for existing users
INSERT INTO user_promotion_eligibility (user_id, has_completed_booking, first_booking_at, total_bookings_count)
SELECT 
  b.guest_id,
  true,
  MIN(b.created_at),
  COUNT(*)
FROM bookings b
WHERE b.status = 'confirmed'
GROUP BY b.guest_id
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE promotions IS 'Core promotions table supporting first booking, promo codes, loyalty rewards, and referrals';
COMMENT ON TABLE promotion_usages IS 'Tracks each time a promotion is applied to a booking';
COMMENT ON TABLE user_referrals IS 'Manages referral program tracking';
COMMENT ON TABLE generated_promo_codes IS 'Stores auto-generated promo codes for loyalty rewards';
COMMENT ON TABLE user_promotion_eligibility IS 'Cached user eligibility data for performance';

COMMENT ON COLUMN promotions.usage_limit_type IS 'Determines how usage limits are enforced: unlimited, once_total, once_per_user, limited_total, or limited_per_user';
COMMENT ON COLUMN promotions.is_stackable IS 'Whether this promotion can be combined with other promotions';
COMMENT ON COLUMN promotions.auto_apply IS 'If true, automatically apply when conditions are met without code entry';
COMMENT ON COLUMN promotions.priority IS 'Higher priority promotions are applied first when stacking is allowed';

