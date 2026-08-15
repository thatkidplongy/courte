-- migrate:up

-- An offer must say WHAT was offered, not just that one exists: the player's "book it now"
-- link needs the court and the range. Cleared when the offer lapses back to waiting.
ALTER TABLE "WaitlistEntry"
  ADD COLUMN offered_court_id bigint REFERENCES "Court"(id) ON DELETE SET NULL,
  ADD COLUMN offered_during tstzrange;

-- migrate:down

ALTER TABLE "WaitlistEntry"
  DROP COLUMN IF EXISTS offered_during,
  DROP COLUMN IF EXISTS offered_court_id;
