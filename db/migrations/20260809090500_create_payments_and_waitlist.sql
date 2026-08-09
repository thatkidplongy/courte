-- migrate:up

-- A ledger, not a status column. Partial payments and refunds stay correct because there is
-- no stored state that can drift out of agreement with the sum of the rows.
CREATE TABLE payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid REFERENCES bookings(id)       ON DELETE RESTRICT,
  series_id    uuid REFERENCES booking_series(id) ON DELETE RESTRICT,
  kind         payment_kind NOT NULL,
  amount_cents int NOT NULL,
  method       text NOT NULL,
  -- Staff member who took an on-site payment. Null for anything captured online.
  recorded_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  external_ref text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_positive CHECK (amount_cents > 0),
  -- A payment settles one occurrence or one whole series, never both and never neither.
  CONSTRAINT payments_has_one_target CHECK (num_nonnulls(booking_id, series_id) = 1)
);
CREATE INDEX payments_booking_idx ON payments (booking_id);
CREATE INDEX payments_series_idx  ON payments (series_id);
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE VIEW booking_payment_state AS
SELECT
  b.id AS booking_id,
  b.total_cents,
  ledger.paid_cents,
  CASE
    WHEN ledger.paid_cents <= 0             THEN 'unpaid'
    WHEN ledger.paid_cents >= b.total_cents THEN 'paid'
    ELSE 'partial'
  END AS payment_state
FROM bookings b
CROSS JOIN LATERAL (
  SELECT COALESCE(SUM(
    CASE WHEN p.kind = 'charge' THEN p.amount_cents ELSE -p.amount_cents END
  ), 0)::int AS paid_cents
  FROM payments p
  WHERE p.booking_id = b.id
) ledger;

CREATE TABLE waitlist_entries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Either a specific court or anything at a venue. At least one is required; both is allowed
  -- and means "this court at this venue".
  venue_id             uuid REFERENCES venues(id) ON DELETE CASCADE,
  court_id             uuid REFERENCES courts(id) ON DELETE CASCADE,
  sport                sport,
  desired              tstzrange NOT NULL,
  min_duration_minutes int NOT NULL DEFAULT 60,
  state                waitlist_state NOT NULL DEFAULT 'waiting',
  offered_at           timestamptz,
  claim_expires_at     timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_has_target CHECK (num_nonnulls(venue_id, court_id) >= 1),
  CONSTRAINT waitlist_min_duration_positive CHECK (min_duration_minutes > 0),
  CONSTRAINT waitlist_offer_is_complete CHECK ((offered_at IS NULL) = (claim_expires_at IS NULL))
);
-- Offers are matched by asking which waiting entries overlap a released range, so the range
-- itself is the index key.
CREATE INDEX waitlist_open_idx ON waitlist_entries USING gist (desired) WHERE state = 'waiting';
CREATE INDEX waitlist_user_idx ON waitlist_entries (user_id, state, created_at DESC);
CREATE TRIGGER waitlist_entries_set_updated_at BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down

DROP TABLE IF EXISTS waitlist_entries;
DROP VIEW IF EXISTS booking_payment_state;
DROP TABLE IF EXISTS payments;
