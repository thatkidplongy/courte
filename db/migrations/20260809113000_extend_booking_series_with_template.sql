-- migrate:up

-- A series must know what it books, not just when. Duration and venue live on the series;
-- the courts it claims each occurrence are an M:N (a league booking two courts every Tuesday
-- is one series), so they get a linking table rather than an array column.

ALTER TABLE "BookingSeries"
  ADD COLUMN venue_id bigint NOT NULL REFERENCES "Venue"(id) ON DELETE RESTRICT,
  ADD COLUMN duration_minutes int NOT NULL,
  ADD COLUMN source booking_source NOT NULL DEFAULT 'online',
  ADD CONSTRAINT booking_series_duration_positive CHECK (duration_minutes > 0);

CREATE TABLE "BookingSeriesCourt" (
  series_id  bigint NOT NULL REFERENCES "BookingSeries"(id) ON DELETE CASCADE,
  court_id   bigint NOT NULL REFERENCES "Court"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series_id, court_id)
);

CREATE INDEX booking_series_venue_idx ON "BookingSeries" (venue_id);
-- Drives the horizon-extension job: "which series have run out of materialised future?"
CREATE INDEX booking_series_horizon_idx ON "BookingSeries" (materialised_until);

-- migrate:down

DROP TABLE IF EXISTS "BookingSeriesCourt";
DROP INDEX IF EXISTS booking_series_horizon_idx;
DROP INDEX IF EXISTS booking_series_venue_idx;

ALTER TABLE "BookingSeries"
  DROP CONSTRAINT IF EXISTS booking_series_duration_positive,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS duration_minutes,
  DROP COLUMN IF EXISTS venue_id;
