-- `place_id` is the Foursquare Place ID in production, or the mock service's
-- synthetic id when USE_MOCK_PLACES=true (see 007_create_collections.sql).
CREATE TABLE IF NOT EXISTS visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  place_id            TEXT NOT NULL,
  place_name          TEXT NOT NULL,
  place_category      TEXT,
  place_address       TEXT,
  place_photo_url     TEXT,
  visit_date          DATE NOT NULL,
  purpose             TEXT,
  services_used       TEXT[] NOT NULL DEFAULT '{}',
  items_purchased     TEXT[] NOT NULL DEFAULT '{}',
  amount_spent        NUMERIC(10, 2),
  rating              SMALLINT CHECK (rating BETWEEN 1 AND 5),
  waiting_minutes     INTEGER,
  photos              TEXT[] NOT NULL DEFAULT '{}',
  notes               TEXT,
  would_visit_again   BOOLEAN,
  privacy             TEXT NOT NULL DEFAULT 'private' CHECK (privacy IN ('public', 'private', 'friends')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits (user_id);
CREATE INDEX IF NOT EXISTS idx_visits_place_id ON visits (place_id);
CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON visits (visit_date);
