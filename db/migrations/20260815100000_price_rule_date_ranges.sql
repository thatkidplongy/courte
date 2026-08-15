-- migrate:up

-- A rate that applies only on some dates. Until now a rule could say "Tuesdays, 17:00–22:00"
-- but not "Christmas Day" or "from the first of next month", so a holiday rate or a price rise
-- had no expression at all.
--
-- Both bounds are nullable and independent, which covers every case with one mechanism:
--   valid_from only  -> a price rise, effective from that date onwards
--   valid_to only    -> a promotion, until that date
--   both, equal      -> a single holiday
--   neither          -> the standing rule, which is every rule that exists today
--
-- Compared in VENUE-LOCAL dates, not UTC. `resolveQuote` already cuts every booking at local
-- midnight for the day-of-week rules, so a date-scoped rule can only start or stop applying at
-- a boundary the segmenting has already made — no new cut points are needed.
ALTER TABLE "PriceRule"
  ADD COLUMN valid_from date,
  ADD COLUMN valid_to   date,
  ADD CONSTRAINT price_rule_valid_range
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from);

-- An overnight window (22:00–02:00) is not supported: a venue wanting one prices it as two
-- rules. That was a comment in resolveQuote and an assumption everywhere else; once owners can
-- type a window into a form, somebody will try it, so the database says no rather than the code
-- quietly resolving it to an empty range.
ALTER TABLE "PriceRule"
  ADD CONSTRAINT price_rule_window_forward
    CHECK (starts_at IS NULL OR ends_at > starts_at);

-- The tie-break. Resolution takes the highest-priority matching rule, and with no secondary
-- ordering two equal-priority rules resolve in whatever order Postgres happened to return —
-- which it does not promise to keep stable. No seed data hits this; owner-editable rules would
-- within a week, and the symptom would be a price that changes between two identical requests.
--
-- Deterministic order is the floor, not the fix. Saving a rule that overlaps another at the
-- same priority is refused in the domain; this makes the existing rows behave predictably in
-- the meantime.
DROP INDEX IF EXISTS price_rule_court_idx;
CREATE INDEX price_rule_court_idx ON "PriceRule" (court_id, priority DESC, created_at DESC, id);

-- migrate:down

DROP INDEX IF EXISTS price_rule_court_idx;
CREATE INDEX price_rule_court_idx ON "PriceRule" (court_id, priority DESC);

ALTER TABLE "PriceRule"
  DROP CONSTRAINT IF EXISTS price_rule_window_forward,
  DROP CONSTRAINT IF EXISTS price_rule_valid_range,
  DROP COLUMN valid_to,
  DROP COLUMN valid_from;
