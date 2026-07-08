CREATE TABLE IF NOT EXISTS requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  source_city   TEXT NOT NULL,
  target_city   TEXT NOT NULL,
  category      TEXT NOT NULL
                CHECK (category IN ('restaurant', 'cafe', 'retail', 'entertainment', 'other')),
  description   TEXT,
  created_by    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  upvote_count  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'Requested'
                CHECK (status IN ('Requested', 'Under Review', 'Planned', 'Coming Soon', 'Not Planned')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_target_city ON requests (target_city);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_upvote_count ON requests (upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests (created_by);
