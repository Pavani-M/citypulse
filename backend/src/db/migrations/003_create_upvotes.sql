CREATE TABLE IF NOT EXISTS upvotes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_upvotes_request_id ON upvotes (request_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_user_id ON upvotes (user_id);
