-- =====================================================
-- USER DEVICE TRACKING
-- =====================================================
-- Track user devices for push notifications, analytics, and security
-- =====================================================

-- Helper function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT,
  os TEXT NOT NULL CHECK (os IN ('ios', 'android', 'web')),
  os_version TEXT,
  app_version TEXT NOT NULL,
  build_number TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  push_token TEXT,
  push_enabled BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX idx_user_devices_push_token ON user_devices(push_token) WHERE push_token IS NOT NULL;
CREATE INDEX idx_user_devices_last_active ON user_devices(last_active_at DESC);

-- Update updated_at trigger
CREATE TRIGGER set_user_devices_updated_at
  BEFORE UPDATE ON user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Users can view their own devices
CREATE POLICY "Users can view own devices"
  ON user_devices FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own devices
CREATE POLICY "Users can insert own devices"
  ON user_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own devices
CREATE POLICY "Users can update own devices"
  ON user_devices FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own devices
CREATE POLICY "Users can delete own devices"
  ON user_devices FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Register or update device
CREATE OR REPLACE FUNCTION register_device(
  p_user_id UUID,
  p_device_id TEXT,
  p_device_name TEXT,
  p_os TEXT,
  p_os_version TEXT,
  p_app_version TEXT,
  p_build_number TEXT,
  p_timezone TEXT DEFAULT 'UTC',
  p_language TEXT DEFAULT 'en',
  p_push_token TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_device_id UUID;
BEGIN
  INSERT INTO user_devices (
    user_id,
    device_id,
    device_name,
    os,
    os_version,
    app_version,
    build_number,
    timezone,
    language,
    push_token,
    push_enabled,
    last_active_at
  ) VALUES (
    p_user_id,
    p_device_id,
    p_device_name,
    p_os,
    p_os_version,
    p_app_version,
    p_build_number,
    p_timezone,
    p_language,
    p_push_token,
    p_push_token IS NOT NULL,
    NOW()
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    device_name = EXCLUDED.device_name,
    os_version = EXCLUDED.os_version,
    app_version = EXCLUDED.app_version,
    build_number = EXCLUDED.build_number,
    timezone = EXCLUDED.timezone,
    language = EXCLUDED.language,
    push_token = EXCLUDED.push_token,
    push_enabled = EXCLUDED.push_enabled,
    last_active_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_device_id;

  RETURN v_device_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update device last active timestamp
CREATE OR REPLACE FUNCTION update_device_last_active(
  p_device_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_devices
  SET last_active_at = NOW(),
      updated_at = NOW()
  WHERE device_id = p_device_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active devices for a user
CREATE OR REPLACE FUNCTION get_user_active_devices(
  p_user_id UUID,
  p_days_threshold INT DEFAULT 30
) RETURNS TABLE (
  id UUID,
  device_id TEXT,
  device_name TEXT,
  os TEXT,
  push_enabled BOOLEAN,
  last_active_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ud.id,
    ud.device_id,
    ud.device_name,
    ud.os,
    ud.push_enabled,
    ud.last_active_at
  FROM user_devices ud
  WHERE ud.user_id = p_user_id
    AND ud.last_active_at > NOW() - (p_days_threshold || ' days')::INTERVAL
  ORDER BY ud.last_active_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old inactive devices
CREATE OR REPLACE FUNCTION cleanup_inactive_devices(
  p_days_threshold INT DEFAULT 90
) RETURNS INT AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM user_devices
  WHERE last_active_at < NOW() - (p_days_threshold || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SCHEDULED CLEANUP (Optional - requires pg_cron extension)
-- =====================================================

-- Uncomment if you have pg_cron enabled:
--
-- SELECT cron.schedule(
--   'cleanup-inactive-devices',
--   '0 2 * * 0',  -- Run every Sunday at 2 AM
--   $$ SELECT cleanup_inactive_devices(90); $$
-- );

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE user_devices IS
  'Stores device information for push notifications, analytics, and security tracking';

COMMENT ON COLUMN user_devices.device_id IS
  'Unique identifier for the device (expo.Constants.deviceId or similar)';

COMMENT ON COLUMN user_devices.push_token IS
  'Expo push token or FCM/APNS token for sending notifications';

COMMENT ON COLUMN user_devices.last_active_at IS
  'Last time the device was active (updated on app launch/resume)';

COMMENT ON FUNCTION register_device IS
  'Register or update device information. Called on app launch.';

COMMENT ON FUNCTION get_user_active_devices IS
  'Get list of active devices for a user (used in settings to manage devices)';

COMMENT ON FUNCTION cleanup_inactive_devices IS
  'Remove devices that have not been active for the specified number of days';
