-- AI agent configuration with versioning (multiple versions, one active)

-- Main config container (one row per agent slug)
CREATE TABLE IF NOT EXISTS ai_agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active_version_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Versioned snapshots of agent behavior
CREATE TABLE IF NOT EXISTS ai_agent_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES ai_agent_configs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_label TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  model TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.40,
  max_steps INTEGER NOT NULL DEFAULT 3,
  system_prompt TEXT,
  system_prompt_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled_tools TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  tool_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  welcome_messages JSONB NOT NULL DEFAULT '{}'::jsonb,
  suggested_prompts JSONB NOT NULL DEFAULT '{}'::jsonb,
  fallback_language TEXT NOT NULL DEFAULT 'fr',
  supported_languages TEXT[] NOT NULL DEFAULT ARRAY['fr', 'en', 'ar'],
  behavior_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  guardrails JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(config_id, version_number)
);

-- Link config.active_version_id -> versions.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_agent_configs_active_version_id_fkey'
  ) THEN
    ALTER TABLE ai_agent_configs
      ADD CONSTRAINT ai_agent_configs_active_version_id_fkey
      FOREIGN KEY (active_version_id)
      REFERENCES ai_agent_config_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS trg_ai_agent_configs_updated_at ON ai_agent_configs;
CREATE TRIGGER trg_ai_agent_configs_updated_at
  BEFORE UPDATE ON ai_agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_ai_agent_config_versions_updated_at ON ai_agent_config_versions;
CREATE TRIGGER trg_ai_agent_config_versions_updated_at
  BEFORE UPDATE ON ai_agent_config_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-increment version_number per config_id
CREATE OR REPLACE FUNCTION set_ai_agent_version_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version_number IS NULL OR NEW.version_number <= 0 THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO NEW.version_number
    FROM ai_agent_config_versions
    WHERE config_id = NEW.config_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_ai_agent_version_number ON ai_agent_config_versions;
CREATE TRIGGER trg_set_ai_agent_version_number
  BEFORE INSERT ON ai_agent_config_versions
  FOR EACH ROW
  EXECUTE FUNCTION set_ai_agent_version_number();

-- Guarantees: one published version max per config
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agent_config_versions_single_published
  ON ai_agent_config_versions(config_id)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_ai_agent_config_versions_config_id
  ON ai_agent_config_versions(config_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_slug
  ON ai_agent_configs(slug);

-- RLS
ALTER TABLE ai_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_config_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read agent configs" ON ai_agent_configs;
CREATE POLICY "Public can read agent configs" ON ai_agent_configs
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage agent configs" ON ai_agent_configs;
CREATE POLICY "Service role can manage agent configs" ON ai_agent_configs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public can read published agent config versions" ON ai_agent_config_versions;
CREATE POLICY "Public can read published agent config versions" ON ai_agent_config_versions
  FOR SELECT
  USING (status = 'published' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage agent config versions" ON ai_agent_config_versions;
CREATE POLICY "Service role can manage agent config versions" ON ai_agent_config_versions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE ai_agent_configs IS 'Top-level AI agent config records (one per agent slug).';
COMMENT ON TABLE ai_agent_config_versions IS 'Versioned snapshots of AI agent behavior. Exactly one published version should be active per config.';
