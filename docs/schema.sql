-- Courte v1 schema
-- See docs/adr/ for the reasoning behind the availability model, the overlap
-- constraint, and the module boundaries.

CREATE EXTENSION IF NOT EXISTS btree_gist;   -- required for court_id WITH = in the exclusion constraint
CREATE EXTENSION IF NOT EXISTS postgis;      -- venue proximity search
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE sport             AS ENUM ('pickleball','badminton','basketball','volleyball','tennis','futsal');
CREATE TYPE booking_status    AS ENUM ('pending','confirmed','cancelled','completed','no_show');
CREATE TYPE booking_source    AS ENUM ('online','phone','walk_in');
CREATE TYPE reservation_kind  AS ENUM ('booking','hold','blackout');
CREATE TYPE reservation_state AS ENUM ('active','released');
CREATE TYPE payment_kind      AS ENUM ('charge','refund');
CREATE TYPE waitlist_state    AS ENUM ('waiting','offered','claimed','expired','cancelled');

-- ---------------------------------------------------------------- identity

CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      citext NOT NULL UNIQUE,
  name       text NOT NULL,
  phone      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------- inventory

CREATE TABLE venues (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  address             text NOT NULL,
  location            geography(Point, 4326) NOT NULL,
  timezone            text NOT NULL,                        -- IANA, e.g. 'Asia/Manila'
  cancellation_window interval NOT NULL DEFAULT '24 hours',
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX venues_location_idx ON venues USING gist (location);

CREATE TABLE venue_members (
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  role     text NOT NULL CHECK (role IN ('owner','staff')),
  PRIMARY KEY (venue_id, user_id)
);

CREATE TABLE courts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id             uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  sport                sport NOT NULL,
  is_indoor            boolean NOT NULL DEFAULT true,
  min_duration_minutes int NOT NULL DEFAULT 60,
  max_duration_minutes int NOT NULL DEFAULT 240,
  increment_minutes    int NOT NULL DEFAULT 30,
  buffer_minutes       int NOT NULL DEFAULT 0,               -- changeover, enforced via reservations.during
  created_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (min_duration_minutes <= max_duration_minutes)
);
CREATE INDEX courts_venue_sport_idx ON courts (venue_id, sport);

-- A window is an anchor weekday, a local start time, and a duration. This is the
-- only shape that handles both a 24/7 pickleball court and a badminton court open
-- 10:00 to midnight without a special case.
--   24/7            -> one row: (0, '00:00', 10080)
--   10:00-24:00 x7  -> seven rows: (n, '10:00', 840)
CREATE TABLE opening_windows (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id         uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  day_of_week      smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),   -- 0 = Monday, venue-local
  starts_at        time NOT NULL,
  duration_minutes int NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 10080)
);
CREATE INDEX opening_windows_court_idx ON opening_windows (court_id, day_of_week);

-- Highest priority matching rule wins. NULL means "any".
CREATE TABLE price_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id            uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  priority            int NOT NULL DEFAULT 0,
  day_of_week         smallint CHECK (day_of_week BETWEEN 0 AND 6),
  starts_at           time,
  ends_at             time,
  member_only         boolean NOT NULL DEFAULT false,
  rate_per_hour_cents int NOT NULL CHECK (rate_per_hour_cents >= 0)
);
CREATE INDEX price_rules_court_idx ON price_rules (court_id, priority DESC);

-- ------------------------------------------------------------------ intent

CREATE TABLE booking_series (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by         uuid NOT NULL REFERENCES users(id),
  rrule              text NOT NULL,          -- RFC 5545
  timezone           text NOT NULL,          -- recurrence expands in this zone, not UTC
  dtstart            timestamptz NOT NULL,
  materialised_until timestamptz NOT NULL,   -- rolling horizon; extended by a job
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id        uuid REFERENCES booking_series(id) ON DELETE SET NULL,
  occurrence_start timestamptz,              -- originally scheduled start; survives a moved occurrence
  user_id          uuid NOT NULL REFERENCES users(id),
  venue_id         uuid NOT NULL REFERENCES venues(id),
  status           booking_status NOT NULL DEFAULT 'pending',
  source           booking_source NOT NULL DEFAULT 'online',
  total_cents      int NOT NULL CHECK (total_cents >= 0),
  rate_snapshot    jsonb NOT NULL,           -- rules resolved at quote time; never recomputed
  cancelled_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT occurrence_requires_series CHECK ((series_id IS NULL) = (occurrence_start IS NULL))
);
CREATE UNIQUE INDEX bookings_series_occurrence_idx
  ON bookings (series_id, occurrence_start) WHERE series_id IS NOT NULL;
CREATE INDEX bookings_user_idx  ON bookings (user_id, created_at DESC);
CREATE INDEX bookings_venue_idx ON bookings (venue_id, status);

-- --------------------------------------------------------------- the guard

-- One booking owns many reservations, which is what makes a tournament across six
-- courts a single atomic insert: if any row overlaps, the whole booking aborts.
CREATE TABLE reservations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id    uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  booking_id  uuid REFERENCES bookings(id) ON DELETE CASCADE,
  kind        reservation_kind NOT NULL,
  state       reservation_state NOT NULL DEFAULT 'active',
  during      tstzrange NOT NULL,            -- blocked interval, includes changeover buffer
  play_during tstzrange NOT NULL,            -- what the player actually gets, shown in the UI
  expires_at  timestamptz,                   -- holds only
  reason      text,                          -- blackouts only
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_ref_matches_kind CHECK (
    (kind =  'blackout' AND booking_id IS NULL) OR
    (kind <> 'blackout' AND booking_id IS NOT NULL)
  ),
  CONSTRAINT hold_has_expiry CHECK ((kind = 'hold') = (expires_at IS NOT NULL)),
  CONSTRAINT during_is_bounded CHECK (lower(during) IS NOT NULL AND upper(during) IS NOT NULL),
  CONSTRAINT play_within_during CHECK (during @> play_during)
);

-- The whole product rests on this.
ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (court_id WITH =, during WITH &&)
  WHERE (state = 'active');

CREATE INDEX reservations_court_during_idx ON reservations USING gist (court_id, during);
CREATE INDEX reservations_expiry_idx       ON reservations (expires_at)
  WHERE kind = 'hold' AND state = 'active';

-- ---------------------------------------------------------------- payments

-- A ledger, not a status column. Partial payments and refunds stay correct because
-- nothing is stored that can disagree with the sum.
CREATE TABLE payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid REFERENCES bookings(id)       ON DELETE RESTRICT,
  series_id    uuid REFERENCES booking_series(id) ON DELETE RESTRICT,
  kind         payment_kind NOT NULL,
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  method       text NOT NULL,                     -- 'cash','gcash','maya','card'
  recorded_by  uuid REFERENCES users(id),         -- staff member, for on-site payments
  external_ref text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_has_one_target CHECK (num_nonnulls(booking_id, series_id) = 1)
);
CREATE INDEX payments_booking_idx ON payments (booking_id);

CREATE VIEW booking_payment_state AS
SELECT
  b.id AS booking_id,
  b.total_cents,
  led.paid_cents,
  CASE
    WHEN led.paid_cents <= 0             THEN 'unpaid'
    WHEN led.paid_cents >= b.total_cents THEN 'paid'
    ELSE 'partial'
  END AS payment_state
FROM bookings b
CROSS JOIN LATERAL (
  SELECT COALESCE(SUM(
    CASE WHEN p.kind = 'charge' THEN p.amount_cents ELSE -p.amount_cents END
  ), 0)::int AS paid_cents
  FROM payments p
  WHERE p.booking_id = b.id
) led;

-- ---------------------------------------------------------------- waitlist

CREATE TABLE waitlist_entries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id             uuid REFERENCES venues(id) ON DELETE CASCADE,
  court_id             uuid REFERENCES courts(id) ON DELETE CASCADE,
  sport                sport,
  desired              tstzrange NOT NULL,
  min_duration_minutes int NOT NULL DEFAULT 60,
  state                waitlist_state NOT NULL DEFAULT 'waiting',
  offered_at           timestamptz,
  claim_expires_at     timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_has_target CHECK (num_nonnulls(venue_id, court_id) >= 1)
);
CREATE INDEX waitlist_open_idx ON waitlist_entries USING gist (desired) WHERE state = 'waiting';
CREATE INDEX waitlist_user_idx ON waitlist_entries (user_id, state);
