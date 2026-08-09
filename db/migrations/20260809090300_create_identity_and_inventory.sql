-- migrate:up

CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      citext NOT NULL UNIQUE,
  name       text NOT NULL,
  phone      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE venues (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  address             text NOT NULL,
  location            geography(Point, 4326) NOT NULL,
  -- IANA zone, e.g. 'Asia/Manila'. Opening hours are expressed in venue-local time, so every
  -- slot calculation needs this; a UTC offset would break the first time a zone changed rules.
  timezone            text NOT NULL,
  cancellation_window interval NOT NULL DEFAULT '24 hours',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX venues_location_idx ON venues USING gist (location);
CREATE TRIGGER venues_set_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A pure pairing carrying one fact (the role), so a composite PK rather than a surrogate.
CREATE TABLE venue_members (
  venue_id   uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  role       venue_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, user_id)
);
CREATE INDEX venue_members_user_idx ON venue_members (user_id);
CREATE TRIGGER venue_members_set_updated_at BEFORE UPDATE ON venue_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE courts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id             uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  sport                sport NOT NULL,
  is_indoor            boolean NOT NULL DEFAULT true,
  min_duration_minutes int NOT NULL DEFAULT 60,
  max_duration_minutes int NOT NULL DEFAULT 240,
  -- Start times land on this grid; duration is still free between min and max.
  increment_minutes    int NOT NULL DEFAULT 30,
  -- Changeover time. Enforced by widening reservations.during, so the same exclusion
  -- constraint that prevents overlap also prevents back-to-back bookings with no gap.
  buffer_minutes       int NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT courts_duration_range CHECK (min_duration_minutes <= max_duration_minutes),
  CONSTRAINT courts_durations_positive CHECK (min_duration_minutes > 0 AND increment_minutes > 0),
  CONSTRAINT courts_buffer_non_negative CHECK (buffer_minutes >= 0)
);
CREATE INDEX courts_venue_sport_idx ON courts (venue_id, sport);
CREATE TRIGGER courts_set_updated_at BEFORE UPDATE ON courts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A window is an anchor weekday, a local start time, and a duration in minutes. This is the
-- only shape that expresses both a 24/7 pickleball court and a badminton court running
-- 10:00 to midnight without a special case:
--   24/7           -> one row  (0, '00:00', 10080)
--   10:00-24:00 x7 -> seven rows (n, '10:00', 840)
-- A (opens_at, closes_at) pair cannot represent either without a sentinel.
CREATE TABLE opening_windows (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id         uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  day_of_week      smallint NOT NULL,   -- 0 = Monday, venue-local
  starts_at        time NOT NULL,
  duration_minutes int NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opening_windows_day_range CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT opening_windows_duration_range CHECK (duration_minutes > 0 AND duration_minutes <= 10080)
);
CREATE INDEX opening_windows_court_idx ON opening_windows (court_id, day_of_week);
CREATE TRIGGER opening_windows_set_updated_at BEFORE UPDATE ON opening_windows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Highest priority matching rule wins; NULL means "any". A court with no matching rule has no
-- price and cannot be quoted, which is deliberate — silence is safer than a default of zero.
CREATE TABLE price_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id            uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  priority            int NOT NULL DEFAULT 0,
  day_of_week         smallint,
  starts_at           time,
  ends_at             time,
  member_only         boolean NOT NULL DEFAULT false,
  rate_per_hour_cents int NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_rules_day_range CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6),
  CONSTRAINT price_rules_rate_non_negative CHECK (rate_per_hour_cents >= 0),
  CONSTRAINT price_rules_window_complete CHECK ((starts_at IS NULL) = (ends_at IS NULL))
);
CREATE INDEX price_rules_court_idx ON price_rules (court_id, priority DESC);
CREATE TRIGGER price_rules_set_updated_at BEFORE UPDATE ON price_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down

DROP TABLE IF EXISTS price_rules;
DROP TABLE IF EXISTS opening_windows;
DROP TABLE IF EXISTS courts;
DROP TABLE IF EXISTS venue_members;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS users;
