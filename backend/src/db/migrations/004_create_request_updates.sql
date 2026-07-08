-- Official updates posted by verified business representatives (or admins).
-- A row with a non-null `status` represents a status-timeline change;
-- a row with a null `status` is a plain progress update/announcement.
CREATE TABLE IF NOT EXISTS request_updates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests (id) ON DELETE CASCADE,
  posted_by  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status     TEXT
             CHECK (status IS NULL OR status IN ('Requested', 'Under Review', 'Planned', 'Coming Soon', 'Not Planned')),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_updates_request_id ON request_updates (request_id);
