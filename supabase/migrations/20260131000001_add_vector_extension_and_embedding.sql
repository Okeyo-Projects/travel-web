-- =====================================================
-- VECTOR SEARCH SETUP
-- Enable pgvector and add embedding column to experiences
-- =====================================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to experiences table (1536 dimensions for OpenAI text-embedding-3-small)
ALTER TABLE experiences 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for fast cosine similarity search
-- Using ivfflat algorithm with 100 lists (good for up to ~100k rows)
CREATE INDEX IF NOT EXISTS idx_experiences_embedding 
ON experiences 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add comment for documentation
COMMENT ON COLUMN experiences.embedding IS 'Vector embedding for semantic search using OpenAI text-embedding-3-small (1536 dimensions)';
