CREATE TABLE IF NOT EXISTS workflow_events (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional bonus: vector search support for local semantic retrieval
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS workflow_embeddings (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES workflow_events(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
