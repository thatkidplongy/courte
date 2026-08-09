# Manual QA walkthrough

Every feature in v1, in dependency order, with the exact steps and the expected result.
Times below are venue-local (Asia/Manila). Seed users: `player@courte.test`,
`owner@picklerroom.test`, `owner@smashcentral.test` — any email works with the dev sign-in.

## Setup

```bash
docker compose up -d
cp .env.example .env.local   # fill AUTH_SECRET + JOB_TRIGGER_SECRET (openssl rand -base64 32)
pnpm install && pnpm db:migrate && pnpm dev
```

Sign in at `http://localhost:3000/api/auth/signin` → "Dev sign-in (any email)".
To reset to pristine seed data at any point: `docker compose down -v && docker compose up -d && pnpm db:migrate`.

## A — Search and availability

| # | Do | Expect |
|---|---|---|
| A1 | Open `/` signed out | Dark hero, floating search bar, pickleball preselected, today's date |
| A2 | Search badminton, tomorrow | Smash Central, 1.1 km, chips starting **10:00 AM** (opening window, not midnight) |
| A3 | Search pickleball, today, late evening | Chips only from the next half-hour onward — past times suppressed |
| A4 | Search tennis | Empty state, no error |
| A5 | Card shows "from ₱500/hr" (badminton) / "from ₱450/hr" (pickleball) | Cheapest non-member rule, from real data |

## B — Court page

| # | Do | Expect |
|---|---|---|
| B1 | Click a chip on a search card | Court page opens with that chip preselected (green) |
| B2 | Check duration options | 1 h → 3 h in 30-min steps (court's min/max/increment) |
| B3 | Click Book with no chip selected | Button is disabled |
| B4 | Badminton, any future date | First chip 10:00 AM, last chip 11:00 PM (a 1-h booking must end by midnight) |

## C — Hold and checkout

| # | Do | Expect |
|---|---|---|
| C1 | Book a slot | Checkout: venue, court, date, time, correct price, countdown from 10:00 |
| C2 | Reload the checkout page | Countdown continues from where it was — the hold is a database row |
| C3 | While the hold is live, open the same court page in a second window | The held chip is gone for everyone |
| C4 | Two windows, two users, same slot, submit Book near-simultaneously | One reaches checkout, the other gets "That slot has just been taken"; nothing half-written |
| C5 | Let the hold expire (wait 10 min, then trigger the sweeper below) | Checkout shows "hold expired"; the chip is public again; booking becomes cancelled |

## D — Confirm, price, cancel

| # | Do | Expect |
|---|---|---|
| D1 | Confirm inside the window | Redirect to My bookings; row `confirmed · unpaid` |
| D2 | Book Mon–Fri 17:00–22:00 badminton | Peak price ₱700/hr; outside it ₱500/hr |
| D3 | Book 9:30–10:30 PM weekday badminton | **₱600.00** — 30 min peak + 30 min base, the segment cut |
| D4 | Cancel a booking >24 h out | Row flips to cancelled; slot reappears publicly |
| D5 | Cancel a booking <24 h out | Refused: "inside its cancellation window"; booking untouched |

## E — Recurring bookings

| # | Do | Expect |
|---|---|---|
| E1 | Court page → Repeat "Weekly · 4 weeks" → Book | "Booked 4 of 4 weeks"; 4 rows in My bookings, one per week |
| E2 | Blackout one future week (dashboard), then book an overlapping weekly series | "Booked 3 of 4 — Already taken: <that date>"; other weeks booked |
| E3 | After E1, revisit the court page for week 1 | Chips show a gap covering the slot plus the court's buffer on both sides |
| E4 | Chips adjacent to the gap | Bookable — they must NOT fail with "slot taken" (buffer-aware chips) |

## F — Waitlist

| # | Do | Expect |
|---|---|---|
| F1 | Court page → join waitlist (window + min duration) | Confirmation; entry `waiting` at top of My bookings |
| F2 | Window shorter than min duration | Refused with a field message |
| F3 | As another user, cancel a booking inside that window | (After the release) entry flips to **slot open!** with claim deadline and a Book-it-now link |
| F4 | Follow Book it now | Court page with the offered start preselected; normal hold checkout |
| F5 | Ignore an offer past its claim window, run expire-offers below | Entry back to `waiting`, offer details cleared |

## G — Roles

| # | Do | Expect |
|---|---|---|
| G1 | As `player@courte.test`, open `/manage/00000000-0000-0000-0000-0000000000c2` | **404** — not 403; existence stays hidden |
| G2 | As `owner@smashcentral.test`, same URL | Dashboard renders; "Manage venue" appears in the header |
| G3 | Signed out, open `/bookings` | Bounced to sign-in with a return URL (proxy gate) |
| G4 | Staff role: `INSERT INTO venue_members (venue_id, user_id, role) SELECT '00000000-0000-0000-0000-0000000000c2', id, 'staff' FROM users WHERE email = 'staff@test.dev';` after signing in once as staff@test.dev | Staff sees the dashboard and can record walk-ins/payments; owner-only actions (pricing, staff, revenue) are the untested seam — see gaps |

## H — Venue desk

| # | Do | Expect |
|---|---|---|
| H1 | Record a walk-in, weekday 6 PM badminton | Appears in Next 24 hours at ₱700 (peak), source `walk-in` |
| H2 | Same court/time again | "That court is already taken for that time" |
| H3 | Public court page for that day | The walk-in's slot (plus buffer) is gone from chips |
| H4 | Take partial payment (e.g. 200) | Row shows paid ₱200.00, state partially paid; take the rest → `settled`, form disappears |
| H5 | "Collected this month" tile | Sum of recorded payments, immediately updated |
| H6 | Blackout over free time | Chips hole appears publicly |
| H7 | Blackout over a sold slot | Refused: "Existing bookings overlap that period" |

## I — Jobs (Vercel Cron stand-ins)

```bash
SECRET=$(grep JOB_TRIGGER_SECRET .env.local | cut -d= -f2)
curl -s -X POST -H "Authorization: Bearer $SECRET" localhost:3000/api/jobs/sweep-holds
curl -s -X POST -H "Authorization: Bearer $SECRET" localhost:3000/api/jobs/expire-offers
curl -s -X POST -H "Authorization: Bearer $SECRET" localhost:3000/api/jobs/extend-horizons
curl -s -X POST localhost:3000/api/jobs/sweep-holds   # no secret -> 401
```

Each returns JSON counts; the wrong/missing secret must 401 before any work runs.

## J — Automated gates

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

63 unit tests; the domain-boundary lint fails if domain code imports Next/React/pg.

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
- **Venue/court/pricing CRUD** — venues, courts, hours and price rules are seed-only; owners
  cannot edit them in the UI.
- **Notifications** — waitlist offers appear in-app only; no email/SMS.
- **Google OAuth** — pending real credentials; dev sign-in is the local path.
- **Integration tests in CI, deploy** — not yet set up.
