-- migrate:up

ALTER TABLE venues
  ADD COLUMN description text,
  ADD COLUMN phone       text,
  ADD COLUMN website     text;

-- The target of the composite foreign key below. A plain FK on court_id alone would happily
-- accept a court belonging to a different venue than the photo claims.
ALTER TABLE courts ADD CONSTRAINT courts_id_venue_key UNIQUE (id, venue_id);

CREATE TABLE venue_photos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  -- NULL means the photo is of the venue rather than one particular court.
  court_id   uuid,
  url        text NOT NULL,
  -- NOT NULL on purpose. A photo with no alternative text is an accessibility defect, not an
  -- optional field, and making it nullable is how it quietly becomes the norm.
  alt        text NOT NULL,
  -- There is no is_primary boolean: two rows could both claim it and the constraint needed to
  -- stop that is more machinery than ordering. The lowest sort_order is the primary photo.
  sort_order int NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_photos_url_present CHECK (length(btrim(url)) > 0),
  CONSTRAINT venue_photos_alt_present CHECK (length(btrim(alt)) > 0),
  FOREIGN KEY (court_id, venue_id) REFERENCES courts (id, venue_id) ON DELETE CASCADE
);
CREATE INDEX venue_photos_venue_idx ON venue_photos (venue_id, sort_order) WHERE deleted_at IS NULL;
CREATE TRIGGER venue_photos_set_updated_at BEFORE UPDATE ON venue_photos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down

DROP TABLE IF EXISTS venue_photos;
ALTER TABLE courts DROP CONSTRAINT IF EXISTS courts_id_venue_key;
ALTER TABLE venues
  DROP COLUMN website,
  DROP COLUMN phone,
  DROP COLUMN description;
