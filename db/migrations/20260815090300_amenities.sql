-- migrate:up

-- A lookup table rather than an enum: a venue adding a pro shop should be a row, not a
-- migration and a deploy. The natural key is the slug, because the slug is what travels in
-- `?amenities=parking,showers` — a surrogate uuid would mean a lookup on every filter parse.
CREATE TABLE amenities (
  slug       text PRIMARY KEY,
  label      text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amenities_slug_shape CHECK (slug ~ '^[a-z][a-z0-9_]*$')
);
CREATE TRIGGER amenities_set_updated_at BEFORE UPDATE ON amenities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A pure pairing, so a composite primary key rather than a surrogate — the same shape as
-- venue_members.
--
-- `deleted_at` here needs care that the other tables do not. Un-ticking and re-ticking an
-- amenity is an ordinary, repeated action, and a tombstone row would make the second tick a
-- primary key violation. Writers must therefore revive rather than insert:
--
--   INSERT INTO venue_amenities (venue_id, amenity_slug) VALUES ($1, $2)
--   ON CONFLICT (venue_id, amenity_slug) DO UPDATE SET deleted_at = NULL
--
-- The tombstone earns its place: it records when a venue stopped claiming a facility, which is
-- the fact in dispute if someone booked while it was still advertised.
CREATE TABLE venue_amenities (
  venue_id     uuid NOT NULL REFERENCES venues(id)      ON DELETE CASCADE,
  amenity_slug text NOT NULL REFERENCES amenities(slug) ON DELETE RESTRICT,
  deleted_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, amenity_slug)
);
CREATE INDEX venue_amenities_slug_idx ON venue_amenities (amenity_slug) WHERE deleted_at IS NULL;
CREATE TRIGGER venue_amenities_set_updated_at BEFORE UPDATE ON venue_amenities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO amenities (slug, label, sort_order) VALUES
  ('aircon',   'Air conditioning', 0),
  ('parking',  'Parking',          1),
  ('showers',  'Showers',          2),
  ('rentals',  'Equipment rental', 3),
  ('lights',   'Night lights',     4),
  ('canteen',  'Canteen',          5);

-- migrate:down

DROP TABLE IF EXISTS venue_amenities;
DROP TABLE IF EXISTS amenities;
