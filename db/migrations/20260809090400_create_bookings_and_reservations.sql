-- migrate:up

CREATE TABLE booking_series (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- RFC 5545 RRULE, the same grammar Teams and Google Calendar use.
  rrule              text NOT NULL,
  -- Recurrence expands in this zone, not UTC: "every Tuesday 19:00" must stay 19:00 local
  -- even across a zone's DST transitions.
  timezone           text NOT NULL,
  dtstart            timestamptz NOT NULL,
  -- Occurrences exist as real rows out to this point. The exclusion constraint cannot protect
  -- a slot that is only implied by an rrule, so the horizon is extended by a job rather than
  -- computed on demand.
  materialised_until timestamptz NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER booking_series_set_updated_at BEFORE UPDATE ON booking_series
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- SET NULL rather than CASCADE: deleting a series must not silently delete bookings people
  -- have already played or paid for. They detach and survive as one-off bookings.
  series_id        uuid REFERENCES booking_series(id) ON DELETE SET NULL,
  -- The originally scheduled start. Survives a moved occurrence, so "the 3rd of March session"
  -- stays identifiable after someone drags it to a different time.
  occurrence_start timestamptz,
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  venue_id         uuid NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  status           booking_status NOT NULL DEFAULT 'pending',
  source           booking_source NOT NULL DEFAULT 'online',
  total_cents      int NOT NULL,
  -- The price rules that applied at quote time. A booking never recomputes its price: the
  -- rate at time of sale is a different fact from today's rate, not a cached copy of it.
  rate_snapshot    jsonb NOT NULL,
  cancelled_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_total_non_negative CHECK (total_cents >= 0),
  CONSTRAINT bookings_occurrence_requires_series CHECK ((series_id IS NULL) = (occurrence_start IS NULL)),
  CONSTRAINT bookings_cancelled_at_matches_status CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
);
CREATE UNIQUE INDEX bookings_series_occurrence_idx
  ON bookings (series_id, occurrence_start) WHERE series_id IS NOT NULL;
CREATE INDEX bookings_user_idx  ON bookings (user_id, created_at DESC);
CREATE INDEX bookings_venue_idx ON bookings (venue_id, status, created_at DESC);
CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- One booking owns many reservations. That is what makes a tournament across six courts a
-- single atomic insert: if any one row overlaps something existing, the whole booking aborts.
CREATE TABLE reservations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id    uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  booking_id  uuid REFERENCES bookings(id) ON DELETE CASCADE,
  kind        reservation_kind NOT NULL,
  state       reservation_state NOT NULL DEFAULT 'active',
  -- The blocked interval, inclusive of changeover buffer. This is what the constraint sees.
  during      tstzrange NOT NULL,
  -- What the player actually gets, and what the UI shows.
  play_during tstzrange NOT NULL,
  expires_at  timestamptz,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservations_booking_matches_kind CHECK (
    (kind =  'blackout' AND booking_id IS NULL) OR
    (kind <> 'blackout' AND booking_id IS NOT NULL)
  ),
  CONSTRAINT reservations_hold_has_expiry CHECK ((kind = 'hold') = (expires_at IS NOT NULL)),
  CONSTRAINT reservations_reason_is_blackout_only CHECK (kind = 'blackout' OR reason IS NULL),
  CONSTRAINT reservations_during_bounded CHECK (lower(during) IS NOT NULL AND upper(during) IS NOT NULL),
  CONSTRAINT reservations_play_within_during CHECK (during @> play_during)
);

-- The whole product rests on this one line. Two players hitting the same slot both reach it;
-- one commits, the other gets SQLSTATE 23P01 and nothing is written. There is deliberately no
-- application-level pre-check, because check-then-insert is a race. See docs/adr/0002.
ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (court_id WITH =, during WITH &&)
  WHERE (state = 'active');

CREATE INDEX reservations_court_during_idx ON reservations USING gist (court_id, during);
CREATE INDEX reservations_booking_idx ON reservations (booking_id);
-- Drives the hold sweeper. Partial, because expired holds are a vanishing fraction of the table.
CREATE INDEX reservations_expiry_idx ON reservations (expires_at)
  WHERE kind = 'hold' AND state = 'active';

CREATE TRIGGER reservations_set_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down

DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS booking_series;
