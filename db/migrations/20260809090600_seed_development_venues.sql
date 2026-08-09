-- migrate:up

-- Development seed only. Fixed UUIDs so integration tests can reference rows without a lookup.
-- Venues and prices mirror the client's mockup: Quezon City, pesos, a 24/7 pickleball court and
-- badminton running 10:00 to midnight — the two cases that break a naive opening-hours model.

INSERT INTO users (id, email, name) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'owner@picklerroom.test', 'Pickle Room Owner'),
  ('00000000-0000-0000-0000-0000000000a2', 'owner@smashcentral.test', 'Smash Central Owner'),
  ('00000000-0000-0000-0000-0000000000b1', 'player@courte.test', 'Test Player');

INSERT INTO venues (id, name, address, location, timezone) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'The Pickle Room QC', 'Quezon City, Metro Manila',
   ST_SetSRID(ST_MakePoint(121.0437, 14.6760), 4326)::geography, 'Asia/Manila'),
  ('00000000-0000-0000-0000-0000000000c2', 'Smash Central', 'Quezon City, Metro Manila',
   ST_SetSRID(ST_MakePoint(121.0512, 14.6689), 4326)::geography, 'Asia/Manila');

INSERT INTO venue_members (venue_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a2', 'owner');

INSERT INTO courts (id, venue_id, name, sport, is_indoor, min_duration_minutes, max_duration_minutes,
                    increment_minutes, buffer_minutes) VALUES
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
   'Court 1', 'pickleball', false, 60, 180, 30, 0),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2',
   'Court A', 'badminton', true, 60, 180, 30, 15);

-- The 24/7 court: a single window anchored on Monday, one week long.
INSERT INTO opening_windows (court_id, day_of_week, starts_at, duration_minutes) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 0, '00:00', 10080);

-- Badminton 10:00 to midnight, every day: fourteen hours from 10:00, seven times.
INSERT INTO opening_windows (court_id, day_of_week, starts_at, duration_minutes)
SELECT '00000000-0000-0000-0000-0000000000d2', day, '10:00'::time, 840
FROM generate_series(0, 6) AS day;

-- Base rate, then a higher weekday-evening peak that wins on priority.
INSERT INTO price_rules (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 0, NULL, NULL, NULL, false, 45000),
  ('00000000-0000-0000-0000-0000000000d2', 0, NULL, NULL, NULL, false, 50000);

INSERT INTO price_rules (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents)
SELECT '00000000-0000-0000-0000-0000000000d2', 10, day, '17:00'::time, '22:00'::time, false, 70000
FROM generate_series(0, 4) AS day;

-- migrate:down

DELETE FROM price_rules     WHERE court_id IN ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
DELETE FROM opening_windows WHERE court_id IN ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
DELETE FROM courts          WHERE id IN ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
DELETE FROM venue_members   WHERE venue_id IN ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
DELETE FROM venues          WHERE id IN ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
DELETE FROM users           WHERE id IN ('00000000-0000-0000-0000-0000000000a1',
                                         '00000000-0000-0000-0000-0000000000a2',
                                         '00000000-0000-0000-0000-0000000000b1');
