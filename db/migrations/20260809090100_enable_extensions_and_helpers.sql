-- migrate:up

-- btree_gist lets an exclusion constraint mix an equality operator (court_id) with an
-- overlap operator (during). Without it the constraint in 20260809090300 cannot be created.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Proximity search: "courts within 10km", and the distance labels on result cards.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- updated_at is maintained here rather than by application code so that a value written by a
-- migration, a psql session or a future service is stamped identically to one written by the app.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- migrate:down

DROP FUNCTION IF EXISTS set_updated_at();

DROP EXTENSION IF EXISTS citext;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS postgis;
DROP EXTENSION IF EXISTS btree_gist;
