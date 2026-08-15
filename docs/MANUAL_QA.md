# Manual QA walkthrough

Every feature in v1, in dependency order, with the exact steps and the expected result.
Times below are venue-local (Asia/Manila). Seed users: `player@courte.test`,
`owner@metrosports.test`, `owner@elroi.test`, `owner@point21.test`, and
`desk@cebucitysports.test` who owns three venues at once — any email works with the dev sign-in.

The seed is six real Cebu City venues (17 courts) taken from OpenStreetMap; the search origin
is Fuente Osmeña Circle, so every result sits between 1.1 km and 2.6 km out.

## Setup

```bash
docker compose up -d
cp .env.example .env
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
pnpm install && pnpm db:migrate && pnpm dev
```

Fill `AUTH_SECRET` in the web env, and `API_JWT_SECRET` + `API_SERVICE_KEY` in **both** env
files with identical values (`openssl rand -base64 32` each). A mismatch shows up as every
signed-in page failing with a 401 from the API — check that first if nothing loads.

Two services now: the API on `:4000`, the web app on `:3000`. `pnpm dev` runs both; if the web
app renders but every list is empty or errors, confirm the API is up with
`curl localhost:4000/health`.

Sign in at `http://localhost:3000/api/auth/signin` → "Dev sign-in (any email)".
To reset to pristine seed data at any point: `docker compose down -v && docker compose up -d && pnpm db:migrate`.

## A — Landing page

| #   | Do                                     | Expect                                                                                         |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A1  | Open `/` signed out                    | Dark hero, floating search bar, pickleball preselected, today's date, location reads Cebu City |
| A2  | "Top courts near you"                  | At most four cards — a teaser, not the catalogue — beside a "Browse every court →" link        |
| A3  | Search badminton, tomorrow             | Leaves the hero and lands on `/courts?sport=badminton&date=…` with the sport already applied   |
| A4  | Header "Find a court", footer the same | Both go to `/courts`, never back to `/`                                                        |
| A5  | Stats band under the teaser            | Counts describe the cards actually shown, not hardcoded numbers                                |

## A′ — Marketplace (`/courts`)

Search is city-wide here: the page asks for a 20 km radius rather than the 10 km a proximity
search defaults to, so the mountain barangays are inside the result set.

| #   | Do                                                | Expect                                                                                         |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A′1 | Open `/courts` with no query                      | **17 courts in Cebu City**, all six sports, nearest first, 12 per page                         |
| A′2 | Page 2                                            | Remaining 5 courts; "Page 2 of 2"; Next is disabled                                            |
| A′3 | Sort "Cheapest first"                             | ₱150 tennis first; Mambaling (2.6 km) outranks White Hills (2.3 km) — price wins over distance |
| A′4 | Sport tennis + surface outdoor                    | 4 courts; "Clear 2 filters" appears; sort is not counted as a filter                           |
| A′5 | Price "Under ₱200/hr"                             | 7 courts, none above ₱200. A court with no public price rule is excluded, not treated as free  |
| A′6 | Sport futsal + surface indoor                     | Empty state with a "Show every court" escape hatch, not an error                               |
| A′7 | Filter, then page 2, then Next                    | Filters survive paging — the pager rewrites only `page`                                        |
| A′8 | `?sport=chess&sort=nonsense`                      | Browses as if unfiltered; junk narrows to the contract enums rather than erroring              |
| A′9 | A card at a venue that has closed for the evening | "No times left" — never "fully booked", which would be a claim the data does not support       |

## A″ — Venue identity (surface, amenities, photos)

| #    | Do                                                                    | Expect                                                                                                  |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A″1  | Rail → Surface → tick only "Covered"                                  | 2 courts, both at Mambaling; each row reads "Covered" — not indoor, not outdoor                         |
| A″2  | Rail → Amenities → tick "Air conditioning"                            | 8 courts across Metro Sports, El Roi and Point 21                                                       |
| A″3  | Add "Showers" to that                                                 | Narrows to 5 courts — El Roi drops out. Ticking two amenities means **both**, never either              |
| A″4  | The "clear filters" count with a sport plus three amenities           | "Clear 2 filters" — amenities count once as a group, however many are ticked                            |
| A″5  | `?amenities=helipad`                                                  | Zero results, not an error and not silently unfiltered. A well-formed slug nobody offers matches nobody |
| A″6  | `?amenities=NOT-A-SLUG` on `/courts`                                  | Browses as unfiltered — the web app drops malformed slugs, as it does junk `sport` and `sort`           |
| A″7  | Same against the API: `localhost:4000/v1/courts?amenities=NOT-A-SLUG` | **400** with a field error. The app is lenient at its edge; the API is strict at its own                |
| A″8  | `?amenities=aircon,aircon`                                            | Identical to `?amenities=aircon`. Slugs are deduplicated, or the AND count would match nothing          |
| A″9  | A court page for any venue                                            | The seeded description sits under the address; amenities render as chips below the fact rule            |
| A″10 | `curl -s localhost:4000/v1/amenities`                                 | Six rows, catalogue order. This is the one cached read on the search page (1 hour)                      |
| A″11 | Every venue, with no photos in the table                              | Cards, rows and the court page banner all show the sport glyph. No broken images, no empty frames       |

Photos have no upload path yet. To see the gallery, insert a row by hand and reload the court page:

```bash
docker exec courte-postgres psql -U courte -d courte -c "INSERT INTO \"VenuePhoto\" (venue_id, url, alt) VALUES (1, 'https://example.test/hall.jpg', 'The main hall');"
```

## A‴ — Archiving

`deleted_at` is the only way inventory is retired. Discovery hides an archived row; the joins
that render an existing booking do not, so history survives.

| #   | Do                                                                                      | Expect                                                                               |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A‴1 | `UPDATE courts SET deleted_at = now() WHERE id = '…d05';`                               | El Roi drops from 3 rows to 2 in search                                              |
| A‴2 | Any remaining El Roi row                                                                | Now says "2 courts" — the sibling count excludes archived courts                     |
| A‴3 | Open `/courts/…d05` directly                                                            | **404**                                                                              |
| A‴4 | Open a sibling's court page                                                             | The grid has two rows; the archived court is not a column                            |
| A‴5 | A booking already played on that court, in My bookings and on the dashboard             | Still listed, still naming the court. Lookup does not filter                         |
| A‴6 | `UPDATE courts SET deleted_at = NULL WHERE id = '…d05';`                                | Everything comes back. Archiving is reversible; deletion would not be                |
| A‴7 | `UPDATE venues SET deleted_at = now() WHERE id = '…c2';` then open a court's page there | **404** — archiving a venue closes every court under it, not just its search listing |
| A‴8 | Restore the venue                                                                       | Its courts are bookable again                                                        |

## B — Court page

| #   | Do                               | Expect                                                                      |
| --- | -------------------------------- | --------------------------------------------------------------------------- |
| B1  | Click a chip on a search card    | Court page opens with that chip preselected (green)                         |
| B2  | Check duration options           | 1 h → 3 h in 30-min steps (court's min/max/increment)                       |
| B3  | Click Book with no chip selected | Button is disabled                                                          |
| B4  | El Roi court, any future date    | First chip 6:00 AM, last chip 11:00 PM (a 1-h booking must end by midnight) |

## C — Hold and checkout

| #   | Do                                                                  | Expect                                                                                     |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| C1  | Book a slot                                                         | Checkout: venue, court, date, time, correct price, countdown from 10:00                    |
| C2  | Reload the checkout page                                            | Countdown continues from where it was — the hold is a database row                         |
| C3  | While the hold is live, open the same court page in a second window | The held chip is gone for everyone                                                         |
| C4  | Two windows, two users, same slot, submit Book near-simultaneously  | One reaches checkout, the other gets "That slot has just been taken"; nothing half-written |
| C5  | Let the hold expire (wait 10 min, then trigger the sweeper below)   | Checkout shows "hold expired"; the chip is public again; booking becomes cancelled         |

## D — Confirm, price, cancel

| #   | Do                                   | Expect                                                       |
| --- | ------------------------------------ | ------------------------------------------------------------ |
| D1  | Confirm inside the window            | Redirect to My bookings; row `confirmed · unpaid`            |
| D2  | Book Mon–Fri 17:00–22:00 at El Roi   | Peak price ₱450/hr; outside it ₱300/hr                       |
| D3  | Book 9:30–10:30 PM weekday at El Roi | **₱375.00** — 30 min peak + 30 min base, the segment cut     |
| D4  | Cancel a booking >24 h out           | Row flips to cancelled; slot reappears publicly              |
| D5  | Cancel a booking <24 h out           | Refused: "inside its cancellation window"; booking untouched |

## E — Recurring bookings

| #   | Do                                                                           | Expect                                                                   |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| E1  | Court page → Repeat "Weekly · 4 weeks" → Book                                | "Booked 4 of 4 weeks"; 4 rows in My bookings, one per week               |
| E2  | Blackout one future week (dashboard), then book an overlapping weekly series | "Booked 3 of 4 — Already taken: <that date>"; other weeks booked         |
| E3  | After E1, revisit the court page for week 1                                  | Chips show a gap covering the slot plus the court's buffer on both sides |
| E4  | Chips adjacent to the gap                                                    | Bookable — they must NOT fail with "slot taken" (buffer-aware chips)     |

## F — Waitlist

| #   | Do                                                             | Expect                                                                                       |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| F1  | Court page → join waitlist (window + min duration)             | Confirmation; entry `waiting` at top of My bookings                                          |
| F2  | Window shorter than min duration                               | Refused with a field message                                                                 |
| F3  | As another user, cancel a booking inside that window           | (After the release) entry flips to **slot open!** with claim deadline and a Book-it-now link |
| F4  | Follow Book it now                                             | Court page with the offered start preselected; normal hold checkout                          |
| F5  | Ignore an offer past its claim window, run expire-offers below | Entry back to `waiting`, offer details cleared                                               |

## G — Roles

| #   | Do                                                                                                                                                                          | Expect                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | As `player@courte.test`, open `/manage/1`                                                                                                                                   | **404** — not 403; existence stays hidden                                                                                                |
| G2  | As `owner@metrosports.test`, same URL                                                                                                                                       | Dashboard renders; "Manage venue" appears in the header                                                                                  |
| G3  | Signed out, open `/bookings`                                                                                                                                                | Bounced to sign-in with a return URL (proxy gate)                                                                                        |
| G4  | Staff role: `INSERT INTO "VenueMember" (venue_id, user_id, role) SELECT 1, id, 'staff' FROM "User" WHERE email = 'staff@test.dev';` after signing in once as staff@test.dev | Staff sees the dashboard and can record walk-ins/payments; owner-only actions (pricing, staff, revenue) are the untested seam — see gaps |
| G5  | As `desk@cebucitysports.test`, open `/v1/venues/memberships` through the app                                                                                                | Three venues come back — White Hills, Mambaling, Cebu City Sports Complex                                                                |

## H — Venue desk

| #   | Do                                                       | Expect                                                                                   |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| H1  | Record a walk-in, weekday 6 PM badminton at Metro Sports | Appears in Next 24 hours at ₱500 (peak), source `walk-in`                                |
| H2  | Same court/time again                                    | "That court is already taken for that time"                                              |
| H3  | Public court page for that day                           | The walk-in's slot (plus buffer) is gone from chips                                      |
| H4  | Take partial payment (e.g. 200)                          | Row shows paid ₱200.00, state partially paid; take the rest → `settled`, form disappears |
| H5  | "Collected this month" tile                              | Sum of recorded payments, immediately updated                                            |
| H6  | Blackout over free time                                  | Chips hole appears publicly                                                              |
| H7  | Blackout over a sold slot                                | Refused: "Existing bookings overlap that period"                                         |

## H′ — Courts & pricing (owner)

Sign in as `owner@elroi.test` and open **Courts & pricing** in the venue rail. Court A starts
with a ₱300 standing rate and five weekday peaks of ₱450, 17:00–22:00.

| #    | Do                                                                       | Expect                                                                                              |
| ---- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| H′1  | The rate card                                                            | 6 rules; the peaks read "Monday, 17:00–22:00" … priority 10; the standing rate "Every day, all day" |
| H′2  | Add ₱900, first and last date both 2026-12-25, priority 20               | Saved; the card now shows "on 2026-12-25"                                                           |
| H′3  | Open the public court page for 25 Dec                                    | **₱900** in every Court A cell — Courts B and C are untouched at ₱300                               |
| H′4  | Same page for 26 Dec                                                     | Back to ₱300. A dated rule applies on its dates and nowhere else                                    |
| H′5  | Add the same rule again at the same priority                             | Refused: "That overlaps an existing rule at the same priority (900 per hour)…"; still 7 rules       |
| H′6  | Add it at priority 30 instead                                            | Allowed — different priorities are the mechanism, not a conflict                                    |
| H′7  | Add a rate with From 22:00 and Until 02:00                               | Refused per-field: "For an overnight rate, add two rules"                                           |
| H′8  | A booking on Court A that already exists, after any rate change          | Its total is unchanged. `rate_snapshot` is what it was sold at, and is never recomputed             |
| H′9  | Opening hours: shorten every day to close at 19:00, with a 20:00 booking | Refused, naming the slot: "would leave 1 booked slot outside them (Sun 16 Aug, 20:00)"              |
| H′10 | Close at 22:00 instead                                                   | Saved; all seven days come back with the new duration                                               |
| H′11 | Untick Sunday and save                                                   | Sunday has no window; the public grid for a Sunday shows the day as closed, not as booked           |
| H′12 | Archive Court C                                                          | Still listed for the owner, flagged **Archived**; gone from public search and the venue grid        |
| H′13 | Restore it                                                               | Back everywhere. There is no delete button, and that is deliberate — see CONVENTIONS.md             |
| H′14 | As `owner@point21.test`, open El Roi's courts URL                        | **404** — not 403. An outsider cannot tell a real venue from a fabricated one                       |

## L — Reviews and ratings

Nothing is seeded, so every row starts from an empty state — which is itself the first thing to
check.

| #   | Step                                                              | Expected                                                                               |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| L1  | Open any court page before writing a review                       | "Reviews" section says **No reviews yet**; no stars anywhere on the row or the heading |
| L2  | `/courts?sort=rating`                                             | 200, and unrated venues sort **after** rated ones, never below the worst               |
| L3  | On `/bookings?period=past`, a finished unreviewed booking         | Star form, **Post review** disabled until a star is picked                             |
| L4  | Pick 4 stars, add a comment, post                                 | Row swaps to "You reviewed this booking"; the venue page shows it and the new average  |
| L5  | Same booking again (reload first)                                 | No form — `canReview` is false once `hasReview` is true                                |
| L6  | `POST /v1/bookings/:id/reviews` for a booking still in the future | 400 — "You can review this once the booking has finished."                             |
| L7  | Same, for a booking belonging to somebody else                    | **404**, not 403 — ownership is enforced by the lookup, so existence stays hidden      |
| L8  | Same, with `rating: 6`                                            | 400, `errors[0].field = rating`                                                        |
| L9  | Push a venue past 4.8 across 10+ reviews                          | **TOP RATED** badge on the search row, the card and the venue page                     |
| L10 | `GET /v1/venues/9999/reviews`                                     | 404 — a fabricated venue is not an empty list                                          |

L7 is the one worth re-running after any change to the reviews service: a review written against
a stranger's booking would attach a rating to a venue the author never visited.

## I — Jobs (now in the API process)

There is nothing to curl. `@nestjs/schedule` runs all three inside `apps/api`: hold sweep every
minute, offer expiry every five, horizon extension at 03:00. The old protected route handlers
and `JOB_TRIGGER_SECRET` are gone (ADR 0004).

| #   | Do                                                          | Expect                                                                           |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| I1  | Leave a hold unconfirmed and watch the API log for a minute | `hold sweep complete` with counts; the chip returns to the court page            |
| I2  | `docker compose stop postgres`, wait a tick, start it again | Job failures logged as `scheduled job failed`, the process stays up, jobs resume |
| I3  | `curl localhost:4000/health` with Postgres stopped          | 503, not 200 — the check runs a real query                                       |

## J — API surface

```bash
curl -s 'localhost:4000/v1/courts?sport=badminton' | jq   # public, 200
curl -s -X POST localhost:4000/v1/holds -d '{}' -H 'content-type: application/json'
```

The second must be 401 before any validation runs — no token, no work. A malformed body behind
a valid token returns 400 with per-field messages under `errors`.

### J′ — Id validation

Ids are integers, so a mistyped URL is now a likely accident rather than an improbable one.
Every row must hold on both services:

| #   | Request                      | API                            | Web                        |
| --- | ---------------------------- | ------------------------------ | -------------------------- |
| J′1 | `/courts/1`                  | 200                            | renders the venue grid     |
| J′2 | `/courts/abc`                | 400, `errors[0].field=courtId` | 404 page                   |
| J′3 | `/courts/0` and `/courts/-1` | 400                            | 404 page                   |
| J′4 | `/courts/9999`               | 404 — well-formed, no such row | 404 page                   |
| J′5 | `/manage/abc` signed out     | —                              | redirects to sign-in first |

J′5 is the ordering check: authentication runs before the id is parsed, so an unauthenticated
caller learns nothing about whether the id was even valid.

## K — Automated gates

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

118 unit tests in `apps/api` and 98 in `apps/web`. Two boundary lints must hold: domain code importing Nest,
Express or a driver fails, and **anything in `apps/web` importing `pg` or an ORM fails** — that
second rule is what keeps the web app from quietly growing a second connection pool.

## Known gaps — deliberately not in v1 yet

Things a tester should NOT expect to find, so their absence isn't mistaken for a bug:

- **No-show marking** — the `markNoShow` permission exists; there is no dashboard button yet.
- **Series editing/cancelling** — `splitRrule` ("this and following") is implemented and tested
  in the domain, but no UI calls it. Cancelling a whole series means cancelling occurrences
  one by one.
- **Waitlist claim state** — "Book it now" runs a normal booking; the entry is never marked
  `claimed` and simply lapses back/expires. Functionally fine, cosmetically loose.
- **Series payments** — the ledger supports paying a whole series (`payments.series_id`);
  the dashboard only records per-occurrence payments.
- **Venue profile, photo and amenity editing** — courts, opening hours and price rules are now
  owner-editable (see H′), but the venue's own description, contact details, photos and
  amenities are still seed-only.
- **Member rates** — `price_rules.member_only` exists and is deliberately absent from the
  pricing form: every caller quotes with `isMember: false` until venue passes are built, so
  such a rule could never fire. Step 6 of `docs/BACKEND_PLAN.md`.
- **Editing a price rule in place** — the API has `PUT …/price-rules/:ruleId` and it is tested;
  the screen only adds and removes. Changing a rate means removing one and adding another.
- **Photo upload** — `venue_photos` exists and every surface renders from it, but there is no
  object storage and no upload endpoint, so the table is empty and everything shows the glyph
  fallback. A photo URL that 404s renders as blank space rather than falling back, because
  catching that needs an onError handler and so a client component.
- **Notifications** — waitlist offers appear in-app only; no email/SMS.
- **Google OAuth** — pending real credentials; dev sign-in is the local path.
- **Integration tests in CI, deploy** — not yet set up. The 118 API unit tests cover the domain
  core; nothing yet exercises the HTTP surface automatically, which is a bigger gap after
  ADR 0004 than before it, because the controller/service layer is new code.
- **Rate limiting** — `BACKEND_STANDARDS.md` requires it on auth endpoints. `POST /v1/identities`
  is currently protected only by the service key, which is not reachable from a browser but is
  also not throttled.
- **API deploy target** — the API is a long-lived process now, so it needs somewhere that runs
  one. Nothing is provisioned.
