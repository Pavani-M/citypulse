-- `place_id` is the Foursquare Place ID in production, or the mock service's
-- synthetic id when USE_MOCK_PLACES=true (see 007_create_collections.sql).
CREATE TABLE IF NOT EXISTS tips (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id       TEXT NOT NULL,
  user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body           TEXT NOT NULL CHECK (char_length(body) <= 250),
  upvote_count   INTEGER NOT NULL DEFAULT 0,
  downvote_count INTEGER NOT NULL DEFAULT 0,
  report_count   INTEGER NOT NULL DEFAULT 0,
  is_pinned      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tips_place_id ON tips (place_id);
CREATE INDEX IF NOT EXISTS idx_tips_user_id ON tips (user_id);

CREATE TABLE IF NOT EXISTS tip_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id     UUID NOT NULL REFERENCES tips (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  value      SMALLINT NOT NULL CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tip_votes_tip_id ON tip_votes (tip_id);

CREATE TABLE IF NOT EXISTS tip_reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id     UUID NOT NULL REFERENCES tips (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tip_id, user_id)
);
