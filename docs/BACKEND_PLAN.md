# Backend plan — from the mockups to the database

The six mockup flows are built and every page server-renders from `apps/api` over HTTP. This
document is the other half: what each page still cannot say truthfully, what has to exist in
Postgres before it can, and the order to build it in.

It is written page by page, because that is where the requirements actually are. The schema
section is downstream of it, not the other way round.

> **Status:** steps 1 and 2 are built — migrations `20260815090000` through
> `20260815100000`. Court surface is an enum, venues carry a profile, photos and amenities are
> real tables filtered in SQL, and price rules are date-scoped, deterministic and owner-editable
> from the venue console. Steps 3 to 8 remain.
>
> Two conventions changed after step 2, adopted from the BYB platform services and applied
> across every migration: **tables are PascalCase singular and always quoted**, and **keys are
> `bigint` identity rather than uuid**. The sixteen migrations were rewritten in place and the
> development database rebuilt from them; no environment is deployed, so nothing else moved.
> See the database section of `CONVENTIONS.md`.
>
> One decision changed during step 1: **archiving is `deleted_at`, repo-wide**, not an
> `archived_at` on courts alone. `venues`, `courts`, `venue_photos`, `amenities` and
> `venue_amenities` all carry it. See the soft-delete section of `CONVENTIONS.md` for the
> discovery-versus-lookup rule that makes it safe.

---

## 0. What is already real

Worth stating first, so none of it gets rebuilt:

| Capability                                                                                      | Where                                         |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| City-wide search: sport, surface, price band, sort, paging, PostGIS radius and distance         | `courtRepository.searchCourts`                |
| Availability from opening windows minus reservations, widened by each court's changeover buffer | `availabilityService` + `domain/availability` |
| Venue day grid, every court × every hour, each hour priced                                      | `venueScheduleService` + `domain/schedule`    |
| **Per-court, time-varying pricing** — segment-cut at every rule edge and local midnight         | `domain/pricing/resolveQuote`                 |
| Hold → confirm → cancel, races arbitrated by a GiST exclusion constraint                        | `domain/booking` + ADR 0002                   |
| Recurring series (RRULE), materialisation horizon, waitlist offers                              | `domain/recurrence`, `domain/waitlist`        |
| Payments as a ledger; payment state derived, never stored                                       | `payments` + `booking_payment_state` view     |
| Dashboard stats, next-24h table, bookings-by-local-hour                                         | `venueDashboardRepository`                    |

The pricing engine in particular already does the thing worth double-checking: a 21:30–22:30
booking on a weekday at El Roi is cut at the 22:00 rule edge and charged ₱225 + ₱150 = ₱375,
not one rate for the whole hour. The segments it produces are stored on the booking as
`rate_snapshot`, so a booking never recomputes its own price.

## 0.1 What is actually static

Every item below is a design element with no table behind it. This list _is_ the work.

| Screen     | Static element                                           | Missing because                                            |
| ---------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| 1a, 1b, 1c | Venue imagery — an accent block with a sport glyph       | no media table                                             |
| 1b, 1c     | `4.9 ★ (127)`, `TOP RATED`                               | no reviews table                                           |
| 1b, 1c     | Amenities: aircon, parking, showers, rentals, lights     | no amenities table                                         |
| 1b         | `Covered` as a third surface                             | `courts.is_indoor` is a boolean                            |
| 1a, 1b     | Location cell reads a fixed "Cebu City" label            | no places or geolocation                                   |
| 1c         | Venue description, phone, house rules                    | no columns                                                 |
| 1d         | "Pay at the venue — cash, GCash or Maya"                 | no online payment                                          |
| 1f         | Period-over-period deltas, revenue series                | no queries                                                 |
| 1f         | Bookings, Courts, Schedule, Pricing, Customers, Settings | no write endpoints at all                                  |
| all        | Member rates                                             | `member_only` rules exist; `isMember` is hardcoded `false` |

---

## 1. Page by page

Each section states the flow end to end, then only what is missing.

### 1a — Landing (`/`)

**Flow.** Render reads `searchCourts` at the city radius for a teaser of four, plus
`fetchBookings` for the signed-in reader's next game. The stats band is computed from the
result set on screen, so it can never advertise more than the search found. The hero form is
a `GET` to `/courts`; the sport tiles are links carrying `sport` and `date`.

**Missing.** A primary photo per venue for the four teaser cards. A real location control —
today the form has a sport select, a date picker, and a label. Nothing else; the landing page
is honest.

### 1b — Search (`/courts`)

**Flow.** `parseCourtFilters` reads the URL, one `searchCourts` call resolves every filter in
SQL — deliberately, so `total` and `data` describe the same set and the pager cannot count
pages that do not exist. The map pins are built client-side from the same rows.

**Missing, in the order the row reads:**

1. **Photo** — the 190px left cell is a placeholder.
2. **Rating and review count** — and with them a `sort=rating` option and the `TOP RATED` badge.
3. **Amenities** — five checkboxes in the rail, filtered in SQL with AND semantics.
4. **`Covered`** — a third surface value, not a boolean.
5. **Location** — a real origin, so radius search means something.

The filter rail already pushes a new URL on every change, so each new filter is one query
parameter and one SQL predicate. No new page mechanics.

### 1c — Court detail (`/courts/[courtId]`)

**Flow.** One call to `fetchVenueSchedule(courtId, date)`. The service resolves the venue from
the court, derives opening hours by calling `getAvailability` with no blocks — one
implementation of "when is this open" — then prices every hour through `resolveQuote`, which is
why the grid shows ₱300 mornings and ₱450 evenings. Selecting a cell arms the panel; submitting
places a hold and redirects to checkout.

**Missing.** Photo gallery. Venue description, phone and house rules. A reviews section. None
of it touches the grid, which is the part that had to be right.

### 1d — Checkout (`/checkout/[bookingId]`)

**Flow.** The page 404s unless the booking is `pending` with a live `holdExpiresAtIso`. The
countdown is client-side but the hold is a database row, so a reload resumes it. Confirm flips
status to `confirmed`; the sweeper cancels anything that lapses.

**Missing.** Online payment. Today "pay at the venue" is the whole payment story, and the
booking exists as `confirmed · unpaid` until someone at the desk records a payment. That is a
coherent product — plenty of Philippine venues run exactly that way — but it is not what the
mockup implies, and it is the single largest external dependency in this plan.

### 1e — Mobile

Same data, different chrome. Nothing backend-shaped is missing here that is not already listed
under the screen it mirrors.

### 1f — Venue dashboard (`/manage/[venueId]`)

**Flow.** `requireVenueAction(…, 'viewBookings')` gates it — a missing membership raises
`NotFoundError`, not `NotPermittedError`, so an outsider cannot distinguish a real venue from a
fabricated one. Every window boundary is computed in the venue's own timezone. Three writes
exist: walk-in, blackout, payment.

**Missing — this is the biggest gap in the product.** The rail lists six sections and routes to
one. The permission map already names the actions (`manageCourts`, `manageHours`,
`managePricing`, `manageStaff`, `viewRevenue`, `markNoShow`); not one has an endpoint. An owner
cannot change a price, add a court, edit opening hours, add staff, or mark a no-show. Every one
of those is a seed-only fact today.

---

## 2. Database design

Migrations in dependency order. Each is small enough to ship on its own.

### M1 — Court surface becomes an enum

```sql
CREATE TYPE court_surface AS ENUM ('indoor', 'outdoor', 'covered');
ALTER TABLE "Court" ADD COLUMN surface court_surface;
UPDATE courts SET surface = CASE WHEN is_indoor THEN 'indoor' ELSE 'outdoor' END;
ALTER TABLE "Court" ALTER COLUMN surface SET NOT NULL;
ALTER TABLE "Court" DROP COLUMN is_indoor;
```

A boolean cannot grow a third value. `CourtSetting` in the contract widens to match, and
`isIndoor` disappears from `CourtSearchItem` — a breaking change to the contract, which is
cheap now and expensive later.

### M2 — Venue profile and photos

```sql
ALTER TABLE "Venue"
  ADD COLUMN description text,
  ADD COLUMN phone       text,
  ADD COLUMN website     text;

ALTER TABLE "Court" ADD CONSTRAINT courts_id_venue_key UNIQUE (id, venue_id);

CREATE TABLE "VenuePhoto" (
  id         bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  venue_id   bigint NOT NULL REFERENCES "Venue"(id) ON DELETE CASCADE,
  court_id   bigint,
  url        text NOT NULL,
  alt        text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (court_id, venue_id) REFERENCES "Court" (id, venue_id) ON DELETE CASCADE
);
CREATE INDEX venue_photos_venue_idx ON "VenuePhoto" (venue_id, sort_order);
```

Three decisions worth their ink. `alt` is `NOT NULL` because a photo with no alt text is an
accessibility defect, not a nullable field. The composite foreign key is what stops a photo
being attached to one venue and a court belonging to another. And there is no `is_primary`
boolean — two rows could both claim it; the lowest `sort_order` is the primary photo, and
ordering already answers the question uniquely.

Upload is out of scope: this table stores URLs. Object storage and a signed-upload endpoint are
their own piece of work.

### M3 — Amenities

```sql
CREATE TABLE "Amenity" (
  slug       text PRIMARY KEY,
  label      text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0
);

CREATE TABLE "VenueAmenity" (
  venue_id     bigint NOT NULL REFERENCES "Venue"(id)     ON DELETE CASCADE,
  amenity_slug text NOT NULL REFERENCES "Amenity"(slug) ON DELETE RESTRICT,
  PRIMARY KEY (venue_id, amenity_slug)
);
```

A lookup table rather than an enum, because a new amenity should be a row rather than a
migration and a deploy. The natural key is the slug: it is what appears in
`?amenities=parking,showers`, and a surrogate key would mean a lookup on every filter parse.

The filter is AND, not OR — a reader who ticks parking and showers wants both:

```sql
AND (cardinality($n::text[]) = 0 OR (
  SELECT count(*) FROM "VenueAmenity" va
   WHERE va.venue_id = v.id AND va.amenity_slug = ANY($n)
) = cardinality($n::text[]))
```

### M4 — Reviews

```sql
CREATE TABLE "Review" (
  id         bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  booking_id bigint NOT NULL UNIQUE REFERENCES "Booking"(id) ON DELETE CASCADE,
  venue_id   bigint NOT NULL REFERENCES "Venue"(id) ON DELETE CASCADE,
  user_id    bigint NOT NULL REFERENCES "User"(id)  ON DELETE CASCADE,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_venue_idx ON "Review" (venue_id, created_at DESC);

CREATE VIEW "VenueRating" AS
SELECT v.id AS venue_id,
       count(r.id)::int AS review_count,
       round(avg(r.rating), 2) AS rating_avg
FROM "Venue" v
LEFT JOIN "Review" r ON r.venue_id = v.id
GROUP BY v.id;
```

`booking_id UNIQUE` is the entire integrity story: one review per booking, and only somebody
who booked can write one. The service adds that play must have ended and the booking must
belong to the caller. Without that anchor a rating is just a number a stranger typed.

A view rather than denormalised columns, matching `booking_payment_state` — the aggregate
cannot drift out of agreement with its rows. If sorting by rating becomes slow, replace the
view with a materialised aggregate refreshed on write; do not pre-empt that.

`TOP RATED` is derived, not stored: `rating_avg >= 4.8 AND review_count >= 10`, thresholds in
`packages/contract/src/consts.ts`.

### M5 — Pricing

The engine is right. Three defects around it.

**(a) Rules cannot be scoped to dates.** A holiday rate, a summer rate, or a price rise
effective next month cannot be expressed.

```sql
ALTER TABLE "PriceRule"
  ADD COLUMN valid_from date,
  ADD COLUMN valid_to   date,
  ADD CONSTRAINT price_rules_valid_range
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from);
```

Both nullable and independent: `valid_from` alone is "from this date onwards", `valid_to` alone
is "until", and both set to the same day is a single holiday. `ruleMatchesSegment` gains a
comparison against the segment's **venue-local** date.

`collectCutPoints` needs no change at all, and it is worth knowing why: it already cuts at
local midnight for every day the booking spans, and a date-scoped rule can only start or stop
applying at a local midnight. The existing cut points are exactly the ones a date range needs.

**(b) `member_only` can never fire.** All four call sites pass `isMember: false`. A venue that
sets a member rate today gets a rule that is silently unreachable. Either the column goes, or
it gets a data model:

```sql
CREATE TABLE "VenuePass" (
  id         bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  venue_id   bigint NOT NULL REFERENCES "Venue"(id) ON DELETE CASCADE,
  user_id    bigint NOT NULL REFERENCES "User"(id)  ON DELETE CASCADE,
  starts_on  date NOT NULL,
  ends_on    date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_passes_range CHECK (ends_on IS NULL OR ends_on >= starts_on)
);
CREATE INDEX venue_passes_lookup ON "VenuePass" (venue_id, user_id);
```

`venue_passes`, emphatically **not** `venue_memberships` — `venue_members` already means staff
and owners, and two tables whose names differ by one word is how somebody eventually grants a
stranger owner rights. `isMember` then means "this user holds a pass covering the play date".
A walk-in has no user, so `isMember: false` there stays correct.

One consequence to state out loud: the quote is resolved and snapshotted at **hold** time, so
buying a pass after holding does not retro-apply. That is the right behaviour, and it needs to
be the documented behaviour rather than a surprise.

**Until passes exist, the pricing UI must not offer a member-only toggle.** Offering it would
let an owner configure a rate that can never be charged.

**(c) Two overlapping rules at equal priority are non-deterministic.**
`findPriceRulesForCourts` orders by `priority DESC` with no tie-break, and `resolveQuote`'s sort
is stable — so equal-priority rules are resolved in whatever order Postgres returned them,
which it does not promise to keep constant. No seed data hits this today. Owner-editable rules
will hit it within a week. Two fixes, both wanted:

```sql
ORDER BY priority DESC, created_at DESC, id
```

and rejecting an overlapping rule at equal priority when the owner saves it, which is the real
fix — the tie-break just stops today's silent coin flip.

**(d) Overnight windows are unsupported** and, once there is a form, somebody will type
`22:00–02:00` into it. The constraint should say so rather than the code assuming it:

```sql
ALTER TABLE "PriceRule" ADD CONSTRAINT price_rules_window_forward
  CHECK (starts_at IS NULL OR ends_at > starts_at);
```

with a validation message telling the owner to split it into two rules.

### M6 — Soft delete _(built in step 1)_

```sql
ALTER TABLE "Venue" ADD COLUMN deleted_at timestamptz;
ALTER TABLE "Court" ADD COLUMN deleted_at timestamptz;
```

This one is a live footgun rather than a feature. `reservations.court_id` is
`ON DELETE CASCADE`, so the moment a delete-court endpoint exists, deleting a court silently
deletes the reservations of paid bookings and leaves the `bookings` rows behind with no slot.

Pulled forward into step 1 and widened to every table the plan adds. The rule that makes it
safe — filter at discovery, not at lookup — is in `CONVENTIONS.md`, along with the revive-on-
conflict pattern the `venue_amenities` junction needs.

### M7 — Search areas

```sql
CREATE TABLE "SearchArea" (
  slug                  text PRIMARY KEY,
  label                 text NOT NULL,
  centroid              geography(Point, 4326) NOT NULL,
  default_radius_metres int  NOT NULL,
  sort_order            int  NOT NULL DEFAULT 0
);
```

The search query already accepts `latitude`, `longitude` and `radiusMetres`; only the UI is
fixed. A seeded list of Cebu districts turns the label into a real select without taking a
dependency on a geocoding provider, and "use my location" feeds the same three parameters from
the browser.

### M8 — Notifications

```sql
CREATE TABLE "Notification" (
  id         bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  kind       text NOT NULL,
  payload    jsonb NOT NULL,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_unread_idx
  ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
```

Written in the same transaction as the event it describes, so a waitlist offer and the notice
of it cannot disagree. Email and SMS are a separate worker reading the same table — the
transactional outbox pattern, and out of scope here.

Without this the waitlist is a feature nobody finds out about: an offer appears in-app and
expires in minutes.

### M9 — Online payment

```sql
CREATE TABLE payment_intents (
  id           bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  booking_id   bigint NOT NULL REFERENCES "Booking"(id) ON DELETE CASCADE,
  provider     text NOT NULL,
  provider_ref text NOT NULL,
  amount_cents int  NOT NULL CHECK (amount_cents > 0),
  state        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_ref)
);
```

`UNIQUE (provider, provider_ref)` is the idempotency key. Payment providers retry webhooks;
without it a retry books the money twice. On success the handler inserts the `payments` row in
the same transaction, so the ledger stays the only place money is counted.

---

## 3. Backend logic

### New read endpoints

| Endpoint                          | Notes                                                                    |
| --------------------------------- | ------------------------------------------------------------------------ |
| `GET /v1/search-areas`            | Public. Feeds the location select.                                       |
| `GET /v1/venues/:venueId`         | Public profile: description, contact, photos, amenities, rating, courts. |
| `GET /v1/venues/:venueId/reviews` | Public, paginated.                                                       |
| `GET /v1/courts` _(widened)_      | `amenities`, `surface`, `sort=rating`.                                   |

### New write endpoints, all behind existing permissions

| Endpoint                                                      | Action                                      |
| ------------------------------------------------------------- | ------------------------------------------- |
| `POST /v1/bookings/:bookingId/reviews`                        | Caller owns the booking and play has ended. |
| `PATCH /v1/venues/:venueId`                                   | `manageVenue` _(new)_                       |
| `POST · PATCH · DELETE /v1/venues/:venueId/courts`            | `manageCourts`                              |
| `GET · PUT /v1/courts/:courtId/opening-windows`               | `manageHours`                               |
| `GET · POST · PATCH · DELETE /v1/courts/:courtId/price-rules` | `managePricing`                             |
| `GET · POST · DELETE /v1/venues/:venueId/members`             | `manageStaff`                               |
| `GET · POST · DELETE /v1/venues/:venueId/passes`              | `managePricing`                             |
| `GET /v1/venues/:venueId/revenue`                             | `viewRevenue`                               |
| `POST /v1/bookings/:bookingId/no-show`                        | `markNoShow`                                |

`requireVenueAction` is called inside each service method, not only at the route — a guard
protects routing, never the action.

### The four write rules that matter

1. **Editing a price rule never re-prices a sold booking.** `rate_snapshot` already guarantees
   it; the CRUD must not grow a "recalculate" path. The rate at time of sale is a different
   fact from today's rate, not a stale copy of it.
2. **Narrowing an opening window over existing bookings is refused**, and the response names the
   bookings that conflict. Silently leaving sold slots outside opening hours is worse than an
   error.
3. **Courts archive, never delete.** See M6.
4. **Overlapping equal-priority price rules are rejected at save.** See M5(c).

### Dashboard analytics

No new tables. Two repository functions:

- `getVenueRevenueByDay(venueId, from, to, timezone)` — `generate_series` LEFT JOIN "Payment",
  grouped on `(p.created_at AT TIME ZONE $tz)::date`, gap-free like the hour histogram.
- Period deltas — call the existing `getVenueStats` a second time over the preceding window of
  equal length rather than writing a second query.

---

## 4. Build order

Ordered by how much each step stops a page from lying.

| #   | Step                                                                             | Migrations     | Screens       |
| --- | -------------------------------------------------------------------------------- | -------------- | ------------- |
| 1   | **Done** — venue identity: surface enum, profile, photos, amenities, soft delete | M1, M2, M3, M6 | 1a, 1b, 1c    |
| 2   | **Done** — pricing and hours: date-scoped rules, ambiguity fix, owner CRUD       | M5a, M5c, M5d  | 1f            |
| 3   | Reviews and ratings — table, view, `sort=rating`, top-rated badge                | M4             | 1b, 1c        |
| 4   | Dashboard analytics and staff — revenue series, deltas, no-show, staff admin     | —              | 1f            |
| 5   | Location — search areas and browser geolocation                                  | M7             | 1a, 1b        |
| 6   | Passes and member pricing                                                        | M5b            | 1c, 1f        |
| 7   | Notifications                                                                    | M8             | cross-cutting |
| 8   | Online payment                                                                   | M9             | 1d            |

Steps 1–6 are self-contained: schema, endpoint, contract, page, tests. Step 7 needs a delivery
decision (in-app only, or email too). Step 8 needs a payment provider account and a publicly
reachable webhook URL, which is infrastructure this repo does not have yet.

Photo upload is deliberately absent from every step. It needs object storage and a
signed-upload endpoint, and it is worth doing once rather than in pieces.
