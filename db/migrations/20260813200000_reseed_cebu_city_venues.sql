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
-- Development seed only. Fixed ids so integration tests can reference a row without a lookup.

-- Bookings and payments hold the old venues by RESTRICT, so they go first. Deleting the
-- venue then cascades courts, opening windows, price rules, memberships and waitlist rows.
DELETE FROM "Payment" WHERE booking_id IN (SELECT id FROM "Booking" WHERE venue_id IN (1, 2));
DELETE FROM "Booking"       WHERE venue_id IN (1, 2);
DELETE FROM "BookingSeries" WHERE venue_id IN (1, 2);
DELETE FROM "Venue"         WHERE id IN (1, 2);
DELETE FROM "User"          WHERE id IN (1, 2);

-- Fresh user ids rather than reusing 1 and 2. A JWT minted before this migration carries the
-- old subject; if that id came back attached to a different person, a stale session would
-- inherit their venues. Leaving the old ids dead makes such a session simply fail to resolve.
--
-- Venue and court ids restart at 1, because nothing outside the database holds one — a
-- session identifies a user, never a venue.
INSERT INTO "User" (id, email, name) VALUES
  (4, 'owner@metrosports.test',   'Metro Sports Owner'),
  (5, 'owner@elroi.test',         'El Roi Owner'),
  (6, 'owner@point21.test',       'Point 21 Owner'),
  (7, 'desk@cebucitysports.test', 'City Sports Office');

INSERT INTO "Venue" (id, name, address, location, timezone) VALUES
  (1, 'Metro Sports Centre',
   'Salinas Drive, Lahug, Cebu City',
   ST_SetSRID(ST_MakePoint(123.9032656, 10.3274870), 4326)::geography, 'Asia/Manila'),
  (2, 'El Roi Badminton',
   'Acacia Street, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8907627, 10.3229401), 4326)::geography, 'Asia/Manila'),
  (3, 'Point 21 Badminton',
   'J. De Veyra Street, Cebu City',
   ST_SetSRID(ST_MakePoint(123.9137454, 10.3084729), 4326)::geography, 'Asia/Manila'),
  (4, 'White Hills Court',
   'West Road, Banawa, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8722624, 10.3180328), 4326)::geography, 'Asia/Manila'),
  (5, 'Mambaling Sports Complex',
   'San Bernardino Street, Mambaling, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8764248, 10.2923878), 4326)::geography, 'Asia/Manila'),
  (6, 'Cebu City Sports Complex',
   'Paulin Drive, Sambag I, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8950365, 10.3005385), 4326)::geography, 'Asia/Manila');

-- The city sports office holds three venues, which is the only seed path that exercises a
-- membership list longer than one.
INSERT INTO "VenueMember" (venue_id, user_id, role) VALUES
  (1, 4, 'owner'),
  (2, 5, 'owner'),
  (3, 6, 'owner'),
  (4, 7, 'owner'),
  (5, 7, 'owner'),
  (6, 7, 'owner');

INSERT INTO "Court" (id, venue_id, name, sport, is_indoor, min_duration_minutes,
                     max_duration_minutes, increment_minutes, buffer_minutes) VALUES
  -- Metro Sports Centre
  ( 1, 1, 'Court 1',          'badminton',  true,  60, 180, 30, 15),
  ( 2, 1, 'Court 2',          'badminton',  true,  60, 180, 30, 15),
  ( 3, 1, 'Court 3',          'pickleball', true,  60, 120, 30, 15),
  -- El Roi Badminton
  ( 4, 2, 'Court A',          'badminton',  true,  60, 180, 30, 10),
  ( 5, 2, 'Court B',          'badminton',  true,  60, 180, 30, 10),
  ( 6, 2, 'Court C',          'badminton',  true,  60, 180, 30, 10),
  -- Point 21 Badminton
  ( 7, 3, 'Court 1',          'badminton',  true,  60, 180, 30, 10),
  ( 8, 3, 'Court 2',          'badminton',  true,  60, 180, 30, 10),
  -- White Hills Court — OSM tags this node basketball;tennis;badminton, floodlit
  ( 9, 4, 'Basketball court', 'basketball', false, 60, 120, 60,  0),
  (10, 4, 'Tennis court',     'tennis',     false, 60, 120, 60,  0),
  (11, 4, 'Badminton court',  'badminton',  false, 60, 120, 30,  0),
  -- Mambaling Sports Complex — OSM tags basketball; tennis; volleyball, and building=roof
  (12, 5, 'Covered court',    'basketball', true,  60, 120, 60,  0),
  (13, 5, 'Volleyball court', 'volleyball', true,  60, 120, 60,  0),
  (14, 5, 'Tennis court',     'tennis',     false, 60, 120, 60,  0),
  -- Cebu City Sports Complex
  (15, 6, 'Tennis court 1',   'tennis',     false, 60, 120, 60,  0),
  (16, 6, 'Tennis court 2',   'tennis',     false, 60, 120, 60,  0),
  (17, 6, 'Futsal pitch',     'futsal',     false, 60, 120, 60,  0);

-- Hand the sequences back after explicit ids, or the next unqualified insert collides.
SELECT setval(pg_get_serial_sequence('"User"',  'id'), (SELECT max(id) FROM "User"));
SELECT setval(pg_get_serial_sequence('"Venue"', 'id'), (SELECT max(id) FROM "Venue"));
SELECT setval(pg_get_serial_sequence('"Court"', 'id'), (SELECT max(id) FROM "Court"));

-- One window per weekday per court: an anchor day, a local opening time, and a duration.
-- El Roi closes at midnight, which is why it is 1080 minutes from 06:00 rather than a
-- closes_at of 00:00 that would sort before its own start.
INSERT INTO "OpeningWindow" (court_id, day_of_week, starts_at, duration_minutes)
SELECT c.id, d.day, v.opens, v.minutes
FROM (VALUES
  (1::bigint, '08:00'::time,  840),
  (2::bigint, '06:00'::time, 1080),
  (3::bigint, '07:00'::time,  960),
  (4::bigint, '06:00'::time,  960),
  (5::bigint, '06:00'::time,  900),
  (6::bigint, '05:00'::time,  960)
) AS v(venue_id, opens, minutes)
JOIN "Court" c ON c.venue_id = v.venue_id
CROSS JOIN generate_series(0, 6) AS d(day);

-- Base rate, always applicable.
INSERT INTO "PriceRule" (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents) VALUES
  ( 1, 0, NULL, NULL, NULL, false, 35000),
  ( 2, 0, NULL, NULL, NULL, false, 35000),
  ( 3, 0, NULL, NULL, NULL, false, 45000),
  ( 4, 0, NULL, NULL, NULL, false, 30000),
  ( 5, 0, NULL, NULL, NULL, false, 30000),
  ( 6, 0, NULL, NULL, NULL, false, 30000),
  ( 7, 0, NULL, NULL, NULL, false, 32000),
  ( 8, 0, NULL, NULL, NULL, false, 32000),
  ( 9, 0, NULL, NULL, NULL, false, 25000),
  (10, 0, NULL, NULL, NULL, false, 20000),
  (11, 0, NULL, NULL, NULL, false, 18000),
  (12, 0, NULL, NULL, NULL, false, 20000),
  (13, 0, NULL, NULL, NULL, false, 20000),
  (14, 0, NULL, NULL, NULL, false, 18000),
  (15, 0, NULL, NULL, NULL, false, 15000),
  (16, 0, NULL, NULL, NULL, false, 15000),
  (17, 0, NULL, NULL, NULL, false, 30000);

-- Weekday evening peak, higher priority so it wins wherever it overlaps the base rule.
-- Only the commercial indoor courts have one; the public courts price flat.
INSERT INTO "PriceRule" (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents)
SELECT p.court_id, 10, d.day, '17:00'::time, '22:00'::time, false, p.rate
FROM (VALUES
  (1::bigint, 50000),
  (2::bigint, 50000),
  (3::bigint, 60000),
  (4::bigint, 45000),
  (5::bigint, 45000),
  (6::bigint, 45000),
  (7::bigint, 48000),
  (8::bigint, 48000)
) AS p(court_id, rate)
CROSS JOIN generate_series(0, 4) AS d(day);

-- migrate:down

DELETE FROM "Payment" WHERE booking_id IN (SELECT id FROM "Booking" WHERE venue_id BETWEEN 1 AND 6);
DELETE FROM "Booking"       WHERE venue_id BETWEEN 1 AND 6;
DELETE FROM "BookingSeries" WHERE venue_id BETWEEN 1 AND 6;
DELETE FROM "Venue"         WHERE id BETWEEN 1 AND 6;
DELETE FROM "User"          WHERE id BETWEEN 4 AND 7;

-- Restore what 20260809090600 created, so rolling back lands on the state that migration left.
INSERT INTO "User" (id, email, name) VALUES
  (1, 'owner@picklerroom.test', 'Pickle Room Owner'),
  (2, 'owner@smashcentral.test', 'Smash Central Owner');

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

SELECT setval(pg_get_serial_sequence('"User"',  'id'), (SELECT max(id) FROM "User"));
SELECT setval(pg_get_serial_sequence('"Venue"', 'id'), (SELECT max(id) FROM "Venue"));
SELECT setval(pg_get_serial_sequence('"Court"', 'id'), (SELECT max(id) FROM "Court"));

INSERT INTO "OpeningWindow" (court_id, day_of_week, starts_at, duration_minutes) VALUES
  (1, 0, '00:00', 10080);

INSERT INTO "OpeningWindow" (court_id, day_of_week, starts_at, duration_minutes)
SELECT 2, day, '10:00'::time, 840
FROM generate_series(0, 6) AS day;

INSERT INTO "PriceRule" (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents) VALUES
  (1, 0, NULL, NULL, NULL, false, 45000),
  (2, 0, NULL, NULL, NULL, false, 50000);

INSERT INTO "PriceRule" (court_id, priority, day_of_week, starts_at, ends_at, member_only, rate_per_hour_cents)
SELECT 2, 10, day, '17:00'::time, '22:00'::time, false, 70000
FROM generate_series(0, 4) AS day;
