-- Create category catalog and experience/category linking table

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  asset TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS experience_categories (
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (experience_id, category_id)
);

CREATE INDEX IF NOT EXISTS experience_categories_experience_idx
  ON experience_categories (experience_id);

CREATE INDEX IF NOT EXISTS experience_categories_category_idx
  ON experience_categories (category_id);

CREATE UNIQUE INDEX IF NOT EXISTS experience_categories_category_order_idx
  ON experience_categories (category_id, order_index);
