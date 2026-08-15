-- migrate:up

-- Replaces the two invented Quezon City venues with six real ones in Cebu City.
--
-- Provenance matters here, so it is spelled out rather than assumed:
--   * name, coordinates, street and opening hours come from OpenStreetMap via Overpass;
--     the three venues whose nodes carried no addr:street were reverse-geocoded through
--     Nominatim. Both are ODbL — © OpenStreetMap contributors, and the web footer says so.
--   * court composition and every rate below are fixtures. OSM models neither bookable
--     courts nor prices, so nothing here should be read as a real price list for a real
--     business. Where OSM tagged the sports (White Hills, Mambaling) the courts follow the
--     tag; where it tagged none, they are invented.
--   * opening hours are real for Metro Sports, El Roi and Point 21 (OSM opening_hours);
--     invented for the other three.
--
-- Development seed only. Fixed UUIDs so integration tests can reference rows without a lookup.

-- Bookings and payments hold the old venues by RESTRICT, so they go first. Deleting the
-- venue then cascades courts, opening windows, price rules, memberships and waitlist rows.
DELETE FROM payments WHERE booking_id IN (
  SELECT id FROM bookings
  WHERE venue_id IN ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2'));
DELETE FROM bookings
  WHERE venue_id IN ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
DELETE FROM booking_series
  WHERE venue_id IN ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
DELETE FROM venues
  WHERE id IN ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
DELETE FROM users
  WHERE id IN ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2');

-- Fresh ids rather than reusing a1/a2. A JWT minted before this migration carries the old
-- subject; if that id came back attached to a different person, a stale session would inherit
-- their venues. Leaving the old ids dead makes such a session simply fail to resolve.
INSERT INTO users (id, email, name) VALUES
  ('00000000-0000-0000-0000-0000000000e1', 'owner@metrosports.test',   'Metro Sports Owner'),
  ('00000000-0000-0000-0000-0000000000e2', 'owner@elroi.test',         'El Roi Owner'),
  ('00000000-0000-0000-0000-0000000000e3', 'owner@point21.test',       'Point 21 Owner'),
  ('00000000-0000-0000-0000-0000000000e4', 'desk@cebucitysports.test', 'City Sports Office');

INSERT INTO venues (id, name, address, location, timezone) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'Metro Sports Centre',
   'Salinas Drive, Lahug, Cebu City',
   ST_SetSRID(ST_MakePoint(123.9032656, 10.3274870), 4326)::geography, 'Asia/Manila'),
  ('00000000-0000-0000-0000-0000000000c2', 'El Roi Badminton',
   'Acacia Street, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8907627, 10.3229401), 4326)::geography, 'Asia/Manila'),
  ('00000000-0000-0000-0000-0000000000c3', 'Point 21 Badminton',
   'J. De Veyra Street, Cebu City',
   ST_SetSRID(ST_MakePoint(123.9137454, 10.3084729), 4326)::geography, 'Asia/Manila'),
  ('00000000-0000-0000-0000-0000000000c4', 'White Hills Court',
   'West Road, Banawa, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8722624, 10.3180328), 4326)::geography, 'Asia/Manila'),
  ('00000000-0000-0000-0000-0000000000c5', 'Mambaling Sports Complex',
   'San Bernardino Street, Mambaling, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8764248, 10.2923878), 4326)::geography, 'Asia/Manila'),
  ('00000000-0000-0000-0000-0000000000c6', 'Cebu City Sports Complex',
   'Paulin Drive, Sambag I, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8950365, 10.3005385), 4326)::geography, 'Asia/Manila');

-- The city sports office holds three venues, which is the only seed path that exercises a
-- membership list longer than one.
INSERT INTO venue_members (venue_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'owner'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e2', 'owner'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e3', 'owner'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000e4', 'owner'),
  ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000e4', 'owner'),
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000e4', 'owner');

INSERT INTO courts (id, venue_id, name, sport, is_indoor, min_duration_minutes,
                    max_duration_minutes, increment_minutes, buffer_minutes) VALUES
  -- Metro Sports Centre
  ('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-0000000000c1', 'Court 1',          'badminton',  true,  60, 180, 30, 15),
  ('00000000-0000-0000-0000-000000000d02', '00000000-0000-0000-0000-0000000000c1', 'Court 2',          'badminton',  true,  60, 180, 30, 15),
  ('00000000-0000-0000-0000-000000000d03', '00000000-0000-0000-0000-0000000000c1', 'Court 3',          'pickleball', true,  60, 120, 30, 15),
  -- El Roi Badminton
  ('00000000-0000-0000-0000-000000000d04', '00000000-0000-0000-0000-0000000000c2', 'Court A',          'badminton',  true,  60, 180, 30, 10),
  ('00000000-0000-0000-0000-000000000d05', '00000000-0000-0000-0000-0000000000c2', 'Court B',          'badminton',  true,  60, 180, 30, 10),
  ('00000000-0000-0000-0000-000000000d06', '00000000-0000-0000-0000-0000000000c2', 'Court C',          'badminton',  true,  60, 180, 30, 10),
  -- Point 21 Badminton
  ('00000000-0000-0000-0000-000000000d07', '00000000-0000-0000-0000-0000000000c3', 'Court 1',          'badminton',  true,  60, 180, 30, 10),
  ('00000000-0000-0000-0000-000000000d08', '00000000-0000-0000-0000-0000000000c3', 'Court 2',          'badminton',  true,  60, 180, 30, 10),
  -- White Hills Court — OSM tags this node basketball;tennis;badminton, floodlit
  ('00000000-0000-0000-0000-000000000d09', '00000000-0000-0000-0000-0000000000c4', 'Basketball court', 'basketball', false, 60, 120, 60,  0),
  ('00000000-0000-0000-0000-000000000d10', '00000000-0000-0000-0000-0000000000c4', 'Tennis court',     'tennis',     false, 60, 120, 60,  0),
  ('00000000-0000-0000-0000-000000000d11', '00000000-0000-0000-0000-0000000000c4', 'Badminton court',  'badminton',  false, 60, 120, 30,  0),
  -- Mambaling Sports Complex — OSM tags basketball; tennis; volleyball, and building=roof
  ('00000000-0000-0000-0000-000000000d12', '00000000-0000-0000-0000-0000000000c5', 'Covered court',    'basketball', true,  60, 120, 60,  0),
  ('00000000-0000-0000-0000-000000000d13', '00000000-0000-0000-0000-0000000000c5', 'Volleyball court', 'volleyball', true,  60, 120, 60,  0),
  ('00000000-0000-0000-0000-000000000d14', '00000000-0000-0000-0000-0000000000c5', 'Tennis court',     'tennis',     false, 60, 120, 60,  0),
  -- Cebu City Sports Complex
  ('00000000-0000-0000-0000-000000000d15', '00000000-0000-0000-0000-0000000000c6', 'Tennis court 1',   'tennis',     false, 60, 120, 60,  0),
  ('00000000-0000-0000-0000-000000000d16', '00000000-0000-0000-0000-0000000000c6', 'Tennis court 2',   'tennis',     false, 60, 120, 60,  0),
  ('00000000-0000-0000-0000-000000000d17', '00000000-0000-0000-0000-0000000000c6', 'Futsal pitch',     'futsal',     false, 60, 120, 60,  0);

-- One window per weekday per court: an anchor day, a local opening time, and a duration.
-- El Roi closes at midnight, which is why it is 1080 minutes from 06:00 rather than a
-- closes_at of 00:00 that would sort before its own start.
INSERT INTO opening_windows (court_id, day_of_week, starts_at, duration_minutes)
SELECT c.id, d.day, v.opens, v.minutes
FROM (VALUES
  ('00000000-0000-0000-0000-0000000000c1'::uuid, '08:00'::time,  840),
  ('00000000-0000-0000-0000-0000000000c2'::uuid, '06:00'::time, 1080),
  ('00000000-0000-0000-0000-0000000000c3'::uuid, '07:00'::time,  960),
  ('00000000-0000-0000-0000-0000000000c4'::uuid, '06:00'::time,  960),
  ('00000000-0000-0000-0000-0000000000c5'::uuid, '06:00'::time,  900),
  ('00000000-0000-0000-0000-0000000000c6'::uuid, '05:00'::time,  960)
) AS v(venue_id, opens, minutes)
JOIN courts c ON c.venue_id = v.venue_id
CROSS JOIN generate_series(0, 6) AS d(day);

-- Base rate, always applicable.
INSERT INTO price_rules (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents) VALUES
  ('00000000-0000-0000-0000-000000000d01', 0, NULL, NULL, NULL, false, 35000),
  ('00000000-0000-0000-0000-000000000d02', 0, NULL, NULL, NULL, false, 35000),
  ('00000000-0000-0000-0000-000000000d03', 0, NULL, NULL, NULL, false, 45000),
  ('00000000-0000-0000-0000-000000000d04', 0, NULL, NULL, NULL, false, 30000),
  ('00000000-0000-0000-0000-000000000d05', 0, NULL, NULL, NULL, false, 30000),
  ('00000000-0000-0000-0000-000000000d06', 0, NULL, NULL, NULL, false, 30000),
  ('00000000-0000-0000-0000-000000000d07', 0, NULL, NULL, NULL, false, 32000),
  ('00000000-0000-0000-0000-000000000d08', 0, NULL, NULL, NULL, false, 32000),
  ('00000000-0000-0000-0000-000000000d09', 0, NULL, NULL, NULL, false, 25000),
  ('00000000-0000-0000-0000-000000000d10', 0, NULL, NULL, NULL, false, 20000),
  ('00000000-0000-0000-0000-000000000d11', 0, NULL, NULL, NULL, false, 18000),
  ('00000000-0000-0000-0000-000000000d12', 0, NULL, NULL, NULL, false, 20000),
  ('00000000-0000-0000-0000-000000000d13', 0, NULL, NULL, NULL, false, 20000),
  ('00000000-0000-0000-0000-000000000d14', 0, NULL, NULL, NULL, false, 18000),
  ('00000000-0000-0000-0000-000000000d15', 0, NULL, NULL, NULL, false, 15000),
  ('00000000-0000-0000-0000-000000000d16', 0, NULL, NULL, NULL, false, 15000),
  ('00000000-0000-0000-0000-000000000d17', 0, NULL, NULL, NULL, false, 30000);

-- Weekday evening peak, higher priority so it wins wherever it overlaps the base rule.
-- Only the commercial indoor courts have one; the public courts price flat.
INSERT INTO price_rules (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents)
SELECT p.court_id, 10, d.day, '17:00'::time, '22:00'::time, false, p.rate
FROM (VALUES
  ('00000000-0000-0000-0000-000000000d01'::uuid, 50000),
  ('00000000-0000-0000-0000-000000000d02'::uuid, 50000),
  ('00000000-0000-0000-0000-000000000d03'::uuid, 60000),
  ('00000000-0000-0000-0000-000000000d04'::uuid, 45000),
  ('00000000-0000-0000-0000-000000000d05'::uuid, 45000),
  ('00000000-0000-0000-0000-000000000d06'::uuid, 45000),
  ('00000000-0000-0000-0000-000000000d07'::uuid, 48000),
  ('00000000-0000-0000-0000-000000000d08'::uuid, 48000)
) AS p(court_id, rate)
CROSS JOIN generate_series(0, 4) AS d(day);

-- migrate:down

DELETE FROM payments WHERE booking_id IN (
  SELECT id FROM bookings WHERE venue_id IN (
    '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
    '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c4',
    '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6'));
DELETE FROM bookings WHERE venue_id IN (
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c4',
  '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6');
DELETE FROM booking_series WHERE venue_id IN (
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c4',
  '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6');
DELETE FROM venues WHERE id IN (
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c4',
  '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6');
DELETE FROM users WHERE id IN (
  '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2',
  '00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e4');

-- Restore what 20260809090600 created, so rolling back lands on the state that migration left.
INSERT INTO users (id, email, name) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'owner@picklerroom.test', 'Pickle Room Owner'),
  ('00000000-0000-0000-0000-0000000000a2', 'owner@smashcentral.test', 'Smash Central Owner');

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

INSERT INTO opening_windows (court_id, day_of_week, starts_at, duration_minutes) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 0, '00:00', 10080);

INSERT INTO opening_windows (court_id, day_of_week, starts_at, duration_minutes)
SELECT '00000000-0000-0000-0000-0000000000d2', day, '10:00'::time, 840
FROM generate_series(0, 6) AS day;

INSERT INTO price_rules (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 0, NULL, NULL, NULL, false, 45000),
  ('00000000-0000-0000-0000-0000000000d2', 0, NULL, NULL, NULL, false, 50000);

INSERT INTO price_rules (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents)
SELECT '00000000-0000-0000-0000-0000000000d2', 10, day, '17:00'::time, '22:00'::time, false, 70000
FROM generate_series(0, 4) AS day;
