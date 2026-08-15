-- migrate:up

-- Provenance, continuing the note in 20260813200000:
--   * Mambaling's two roofed courts are `covered` on OSM evidence — that node carries
--     building=roof, which is exactly the case a boolean could not express.
--   * White Hills' night lights are OSM evidence too (the node is tagged floodlit).
--   * Every other amenity below, and every description, is a FIXTURE. OSM models neither, and
--     none of it should be read as a claim about the real business that shares the name.
--   * phone and website are deliberately left NULL. Court composition and rates being invented
--     is a development convenience; an invented phone number sends real calls to a real person.

UPDATE "Court" SET surface = 'covered' WHERE id IN (12, 13);

UPDATE "Venue" SET description = v.description
FROM (VALUES
  (1::bigint,
   'Air-conditioned indoor centre in Lahug with two badminton courts and a pickleball court. Racket hire at the desk, showers on site.'),
  (2::bigint,
   'Three air-conditioned badminton courts off Acacia Street, open from six in the morning until midnight.'),
  (3::bigint,
   'Two-court badminton hall on J. De Veyra Street. Air-conditioned, with showers and racket hire.'),
  (4::bigint,
   'Floodlit outdoor courts in Banawa — basketball, tennis and badminton on the same compound.'),
  (5::bigint,
   'Community complex in Mambaling. The basketball and volleyball courts sit under a roof; the tennis court is open air.'),
  (6::bigint,
   'The city''s public complex at Sambag I: two tennis courts and a futsal pitch, floodlit and open from five.')
) AS v(id, description)
WHERE "Venue".id = v.id;

INSERT INTO "VenueAmenity" (venue_id, amenity_slug)
SELECT v.venue_id, a.slug
FROM (VALUES
  (1::bigint, ARRAY['aircon', 'parking', 'showers', 'rentals', 'canteen']),
  (2::bigint, ARRAY['aircon', 'parking', 'rentals']),
  (3::bigint, ARRAY['aircon', 'parking', 'showers', 'rentals']),
  (4::bigint, ARRAY['lights', 'parking']),
  (5::bigint, ARRAY['lights', 'parking', 'canteen']),
  (6::bigint, ARRAY['lights', 'parking', 'showers', 'canteen'])
) AS v(venue_id, slugs)
CROSS JOIN LATERAL unnest(v.slugs) AS a(slug);

-- migrate:down

DELETE FROM "VenueAmenity" WHERE venue_id BETWEEN 1 AND 6;

UPDATE "Venue" SET description = NULL WHERE id BETWEEN 1 AND 6;

UPDATE "Court" SET surface = 'indoor' WHERE id IN (12, 13);
