-- migrate:up

-- A boolean cannot grow a third value, and the marketplace needs one: a covered court is
-- roofed but open at the sides, which is neither indoor nor outdoor and is the difference
-- between playing and not playing when it rains.
CREATE TYPE court_surface AS ENUM ('indoor', 'outdoor', 'covered');

ALTER TABLE courts ADD COLUMN surface court_surface;
-- The CASE resolves to text, which Postgres will not implicitly narrow to a new enum.
UPDATE courts SET surface = (CASE WHEN is_indoor THEN 'indoor' ELSE 'outdoor' END)::court_surface;
ALTER TABLE courts ALTER COLUMN surface SET NOT NULL;

-- `is_indoor` is dropped rather than kept alongside: `surface` strictly contains it, and a
-- derived duplicate that nothing maintains drifts the first time a court is inserted through
-- a path that sets only one of them. Nothing is lost — the down migration reconstructs it.
ALTER TABLE courts DROP COLUMN is_indoor;

-- migrate:down

ALTER TABLE courts ADD COLUMN is_indoor boolean;
UPDATE courts SET is_indoor = (surface = 'indoor');
ALTER TABLE courts ALTER COLUMN is_indoor SET NOT NULL;
ALTER TABLE courts ALTER COLUMN is_indoor SET DEFAULT true;

ALTER TABLE courts DROP COLUMN surface;
DROP TYPE IF EXISTS court_surface;
