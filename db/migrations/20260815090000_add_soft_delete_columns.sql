-- migrate:up

-- Nothing in the inventory is ever removed. `reservations.court_id` cascades on delete, so a
-- hard DELETE of a court would take the reservations of paid bookings with it and leave the
-- bookings behind pointing at nothing. Archiving is the only safe way to retire inventory.
--
-- The convention, stated once and applied everywhere it appears:
--   NULL      = live
--   timestamp = archived at that moment, and invisible to discovery
--
-- Filtered at DISCOVERY, not at lookup. Search, a venue's court list, and the court a new
-- booking targets all exclude archived rows. Joins that render an EXISTING booking do not —
-- a booking played on a court that has since been retired must still be able to say its name.
ALTER TABLE venues ADD COLUMN deleted_at timestamptz;
ALTER TABLE courts ADD COLUMN deleted_at timestamptz;

-- The search's hot path is ST_DWithin against this index, and every search excludes archived
-- venues, so the predicate belongs in the index rather than being applied to its output.
DROP INDEX IF EXISTS venues_location_idx;
CREATE INDEX venues_location_idx ON venues USING gist (location) WHERE deleted_at IS NULL;

CREATE INDEX courts_live_venue_idx ON courts (venue_id, sport) WHERE deleted_at IS NULL;

-- migrate:down

DROP INDEX IF EXISTS courts_live_venue_idx;
DROP INDEX IF EXISTS venues_location_idx;
CREATE INDEX venues_location_idx ON venues USING gist (location);

ALTER TABLE courts DROP COLUMN deleted_at;
ALTER TABLE venues DROP COLUMN deleted_at;
