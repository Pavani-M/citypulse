-- `place_id` is the Google Place ID in production, or the mock service's
-- synthetic id when USE_MOCK_PLACES=true.
CREATE TABLE IF NOT EXISTS saved_places (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  place_id            TEXT NOT NULL,
  name                TEXT NOT NULL,
  address             TEXT,
  category            TEXT,
  rating              NUMERIC(2, 1),
  user_ratings_total  INTEGER,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  photo_url           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON saved_places (user_id);
