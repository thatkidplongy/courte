-- migrate:up

-- Development seed only. Fixed ids so integration tests can reference a row without a lookup.
-- Venues and prices mirror the client's mockup: Quezon City, pesos, a 24/7 pickleball court and
-- badminton running 10:00 to midnight — the two cases that break a naive opening-hours model.
--
-- Every id here is superseded by 20260813200000, which replaces these venues with real Cebu
-- City ones. They are written explicitly rather than left to the sequence so that migration
-- can delete exactly these rows and nothing else.

INSERT INTO "User" (id, email, name) VALUES
  (1, 'owner@picklerroom.test', 'Pickle Room Owner'),
  (2, 'owner@smashcentral.test', 'Smash Central Owner'),
  (3, 'player@courte.test', 'Test Player');

INSERT INTO "Venue" (id, name, address, location, timezone) VALUES
  (1, 'The Pickle Room QC', 'Quezon City, Metro Manila',
   ST_SetSRID(ST_MakePoint(121.0437, 14.6760), 4326)::geography, 'Asia/Manila'),
  (2, 'Smash Central', 'Quezon City, Metro Manila',
   ST_SetSRID(ST_MakePoint(121.0512, 14.6689), 4326)::geography, 'Asia/Manila');

INSERT INTO "VenueMember" (venue_id, user_id, role) VALUES
  (1, 1, 'owner'),
  (2, 2, 'owner');

INSERT INTO "Court" (id, venue_id, name, sport, is_indoor, min_duration_minutes, max_duration_minutes,
                     increment_minutes, buffer_minutes) VALUES
  (1, 1, 'Court 1', 'pickleball', false, 60, 180, 30, 0),
  (2, 2, 'Court A', 'badminton',  true,  60, 180, 30, 15);

-- Explicit ids leave the identity sequences still pointing at 1, so the next unqualified
-- insert would collide. Every seed migration has to hand the sequence back afterwards.
SELECT setval(pg_get_serial_sequence('"User"',  'id'), (SELECT max(id) FROM "User"));
SELECT setval(pg_get_serial_sequence('"Venue"', 'id'), (SELECT max(id) FROM "Venue"));
SELECT setval(pg_get_serial_sequence('"Court"', 'id'), (SELECT max(id) FROM "Court"));

-- The 24/7 court: a single window anchored on Monday, one week long.
INSERT INTO "OpeningWindow" (court_id, day_of_week, starts_at, duration_minutes) VALUES
  (1, 0, '00:00', 10080);

-- Badminton 10:00 to midnight, every day: fourteen hours from 10:00, seven times.
INSERT INTO "OpeningWindow" (court_id, day_of_week, starts_at, duration_minutes)
SELECT 2, day, '10:00'::time, 840
FROM generate_series(0, 6) AS day;

-- Base rate, then a higher weekday-evening peak that wins on priority.
INSERT INTO "PriceRule" (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents) VALUES
  (1, 0, NULL, NULL, NULL, false, 45000),
  (2, 0, NULL, NULL, NULL, false, 50000);

INSERT INTO "PriceRule" (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents)
SELECT 2, 10, day, '17:00'::time, '22:00'::time, false, 70000
FROM generate_series(0, 4) AS day;

-- migrate:down

DELETE FROM "PriceRule"     WHERE court_id IN (1, 2);
DELETE FROM "OpeningWindow" WHERE court_id IN (1, 2);
DELETE FROM "Court"         WHERE id IN (1, 2);
DELETE FROM "VenueMember"   WHERE venue_id IN (1, 2);
DELETE FROM "Venue"         WHERE id IN (1, 2);
DELETE FROM "User"          WHERE id IN (1, 2, 3);
