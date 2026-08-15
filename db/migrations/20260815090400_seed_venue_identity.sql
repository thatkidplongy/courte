-- migrate:up

-- Provenance, continuing the note in 20260813200000:
--   * Mambaling's two roofed courts are `covered` on OSM evidence — that node carries
--     building=roof, which is exactly the case a boolean could not express.
--   * White Hills' night lights are OSM evidence too (the node is tagged floodlit).
--   * Every other amenity below, and every description, is a FIXTURE. OSM models neither, and
--     none of it should be read as a claim about the real business that shares the name.
--   * phone and website are deliberately left NULL. Court composition and rates being invented
--     is a development convenience; an invented phone number sends real calls to a real person.

UPDATE courts SET surface = 'covered'
WHERE id IN ('00000000-0000-0000-0000-000000000d12', '00000000-0000-0000-0000-000000000d13');

UPDATE venues SET description = v.description
FROM (VALUES
  ('00000000-0000-0000-0000-0000000000c1'::uuid,
   'Air-conditioned indoor centre in Lahug with two badminton courts and a pickleball court. Racket hire at the desk, showers on site.'),
  ('00000000-0000-0000-0000-0000000000c2'::uuid,
   'Three air-conditioned badminton courts off Acacia Street, open from six in the morning until midnight.'),
  ('00000000-0000-0000-0000-0000000000c3'::uuid,
   'Two-court badminton hall on J. De Veyra Street. Air-conditioned, with showers and racket hire.'),
  ('00000000-0000-0000-0000-0000000000c4'::uuid,
   'Floodlit outdoor courts in Banawa — basketball, tennis and badminton on the same compound.'),
  ('00000000-0000-0000-0000-0000000000c5'::uuid,
   'Community complex in Mambaling. The basketball and volleyball courts sit under a roof; the tennis court is open air.'),
  ('00000000-0000-0000-0000-0000000000c6'::uuid,
   'The city''s public complex at Sambag I: two tennis courts and a futsal pitch, floodlit and open from five.')
) AS v(id, description)
WHERE venues.id = v.id;

INSERT INTO venue_amenities (venue_id, amenity_slug)
SELECT v.venue_id, a.slug
FROM (VALUES
  ('00000000-0000-0000-0000-0000000000c1'::uuid, ARRAY['aircon', 'parking', 'showers', 'rentals', 'canteen']),
  ('00000000-0000-0000-0000-0000000000c2'::uuid, ARRAY['aircon', 'parking', 'rentals']),
  ('00000000-0000-0000-0000-0000000000c3'::uuid, ARRAY['aircon', 'parking', 'showers', 'rentals']),
  ('00000000-0000-0000-0000-0000000000c4'::uuid, ARRAY['lights', 'parking']),
  ('00000000-0000-0000-0000-0000000000c5'::uuid, ARRAY['lights', 'parking', 'canteen']),
  ('00000000-0000-0000-0000-0000000000c6'::uuid, ARRAY['lights', 'parking', 'showers', 'canteen'])
) AS v(venue_id, slugs)
CROSS JOIN LATERAL unnest(v.slugs) AS a(slug);

-- migrate:down

DELETE FROM venue_amenities WHERE venue_id IN (
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c4',
  '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6');

UPDATE venues SET description = NULL WHERE id IN (
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c4',
  '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6');

UPDATE courts SET surface = 'indoor'
WHERE id IN ('00000000-0000-0000-0000-000000000d12', '00000000-0000-0000-0000-000000000d13');
