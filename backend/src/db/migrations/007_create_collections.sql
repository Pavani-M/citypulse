CREATE TABLE IF NOT EXISTS collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections (user_id);

-- `place_id` is the Foursquare Place ID in production, or the mock service's
-- synthetic id when USE_MOCK_PLACES=true.
CREATE TABLE IF NOT EXISTS collection_places (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  place_id      TEXT NOT NULL,
  name          TEXT NOT NULL,
  category      TEXT,
  address       TEXT,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  photo_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_places_collection_id ON collection_places (collection_id);
