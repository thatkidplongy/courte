-- migrate:up

-- Native enums rather than CHECK constraints or lookup tables: the schema documents its own
-- valid values, and an invalid one fails at write time instead of surfacing as bad data later.
CREATE TYPE sport             AS ENUM ('pickleball', 'badminton', 'basketball', 'volleyball', 'tennis', 'futsal');
CREATE TYPE booking_status    AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE booking_source    AS ENUM ('online', 'phone', 'walk_in');
CREATE TYPE reservation_kind  AS ENUM ('booking', 'hold', 'blackout');
CREATE TYPE reservation_state AS ENUM ('active', 'released');
CREATE TYPE payment_kind      AS ENUM ('charge', 'refund');
CREATE TYPE waitlist_state    AS ENUM ('waiting', 'offered', 'claimed', 'expired', 'cancelled');
CREATE TYPE venue_role        AS ENUM ('owner', 'staff');

-- migrate:down

DROP TYPE IF EXISTS venue_role;
DROP TYPE IF EXISTS waitlist_state;
DROP TYPE IF EXISTS payment_kind;
DROP TYPE IF EXISTS reservation_state;
DROP TYPE IF EXISTS reservation_kind;
DROP TYPE IF EXISTS booking_source;
DROP TYPE IF EXISTS booking_status;
DROP TYPE IF EXISTS sport;
