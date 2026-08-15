# Conventions

Repo-specific rules. These take precedence over `~/Develop/CLAUDE.md`,
`~/Develop/FRONTEND_STANDARDS.md` and `~/Develop/BACKEND_STANDARDS.md` where they overlap;
everything not contradicted here still applies.

## Design system

The look comes from a Claude Design project — **"UI mockups brand decision"**, the Modernist
system retuned to a green brand. Modernist is flat and architectural: nothing floats, nothing
is decorated, and alignment plus the weight of the dividers do all the organising.

The rules that decide most arguments:

- **One radius.** 6px, everywhere. Tailwind's whole `rounded-*` scale is collapsed onto the
  single `--radius` token in `globals.css`, so a stray `rounded-2xl` cannot reintroduce a
  second corner size. `rounded-full` is still available, for dots and avatars only.
- **Rules, not shadows.** 1px `border-border` for an ordinary edge; `border-ink` at 2px for a
  structural divider — a section break, the line under a page title, the top of a totals row.
  A shadow means the element genuinely floats: the search bar over the hero, a popover. It is
  not a way to make a card look nicer.
- **Flush left.** Headings, copy, stat figures, and the label inside a button wider than its
  text (see the checkout confirm button).
- **Sparing accent.** The system is ink on white. Green marks the primary action and small
  emphasis; if a screen has two green things competing, one of them is wrong.
- **Micro-caps for labels.** 10px, 600, `tracking-[0.12em]`, muted — that is `FieldLabel`, and
  every caption above a control or a figure goes through it.

Colour, type and spacing live only in the `@theme` and `:root` blocks of
[`globals.css`](apps/web/src/app/globals.css). Components reference semantic tokens
(`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`) and never a hex. The one
hue outside the mono scheme is `warn-50`/`warn-700`, which exists so a pending or part-paid
booking can read as neither settled nor wrong.

Type is Archivo throughout, heading and body separated by weight alone — 800 display, 600/700
labels, 400 copy.

### Screen chrome

The mockups give four different headers, so the root layout renders none. Each area brings its
own:

| Area                                    | Chrome                                         |
| --------------------------------------- | ---------------------------------------------- |
| `app/(site)/` — landing, bookings       | Night `SiteHeader` + `SiteFooter`              |
| `app/courts/` — search                  | `SearchHeaderBar`, the search bar _is_ the nav |
| `app/courts/[courtId]`, `app/checkout/` | A back bar and the mark, nothing else          |
| `app/manage/[venueId]`                  | `VenueSidebar`, the night rail                 |

`MobileTabBar` is global and shows below `lg`, where it — not the header — is the navigation.

### What the mockups draw that we do not build

Star ratings, review counts and "top rated" are real now. What has not changed is the reason
they were left out before: **no venue is seeded with reviews**, because a fabricated 4.9 next to
a real business's name is a lie with that business's name attached. Ratings appear when players
write them, and every screen renders the unrated case rather than an empty row of stars. Same
reasoning for the venue nav: the
rail carries Overview and Courts & pricing, and will carry the mockup's other five sections
when they have routes. A nav item that navigates nowhere makes the whole rail untrustworthy,
so the list in `lib/venueNav.ts` grows as the routes do.

Two more, for the record: the dashboard has no period-over-period deltas and no revenue time
series (both need aggregate queries that do not exist yet), and the booking summary panel shows
an hourly rate rather than a total, because the total is resolved server-side at checkout where
a booking crossing a peak boundary is priced per segment.

Amenities, the third "Covered" surface and venue photos **are** built now — see
[`docs/BACKEND_PLAN.md`](docs/BACKEND_PLAN.md) for what remains. No venue has uploaded a photo,
so `VenueImage` falls back to the sport's glyph; there is no upload path, and a photo URL that
404s currently renders as blank space rather than falling back, because catching that needs an
onError handler and therefore a client component.

## Database naming and keys

Adopted from the BYB platform services (`platform-agentic`), so that anyone moving between the
two repos reads the same shapes.

**Tables are PascalCase singular, and every reference is double-quoted.** `"Court"`,
`"PriceRule"`, `"BookingPaymentState"`. This is not stylistic in Postgres: an unquoted
identifier is folded to lower case, so `FROM Court` resolves to a table named `court` that does
not exist. There is no lint rule that catches a missing quote — it fails at runtime, in whatever
query you forgot it in, so treat the quotes as part of the name.

Columns stay `snake_case`. Repositories rename to camelCase at the boundary, in the `toX` mapper
and nowhere else.

**Keys are `bigint` identity, not uuid.** Declared `GENERATED BY DEFAULT AS IDENTITY` rather
than `ALWAYS`, because the development seed assigns small fixed ids — venues 1–6, courts 1–17 —
so a test can name a row without a lookup. Any migration that inserts explicit ids must hand the
sequence back afterwards, or the next unqualified insert collides:

```sql
SELECT setval(pg_get_serial_sequence('"Court"', 'id'), (SELECT max(id) FROM "Court"));
```

Two consequences worth knowing before they bite:

- **`pg` returns int8 as a string.** `db/client.ts` registers a type parser so ids arrive as
  numbers; without it every id would be `'1'` and compare unequal to `1`. The parser is safe
  only because `idSchema` caps ids at `MAX_SAFE_INTEGER` — a genuinely large bigint column
  added later must be read as text instead.
- **Ids reach us as strings from three places** a type cannot help with: a path segment, a
  query parameter, and a form field. Each has one parser and they share `idSchema`, so both
  services agree on what an id is: `parseId` in the API, `parseRouteId` and `readFormId` on the
  web. A malformed id is a 400 naming the field, or a 404 at a page boundary — never a 500.

`"Amenity"` is the one table with no integer key. Its slug is the natural key because the slug
is what travels in `?amenities=parking,showers`.

## Soft delete

Nothing in the inventory is hard-deleted. `"Venue"`, `"Court"`, `"VenuePhoto"`, `"Amenity"` and
`"VenueAmenity"` each carry `deleted_at timestamptz`: NULL is live, a timestamp is archived.

This is not a preference. `"Reservation".court_id` cascades on delete, so a real `DELETE` of a
court takes the reservations of paid bookings with it and leaves the bookings pointing at
nothing.

**The rule is: filter at discovery, not at lookup.**

- _Discovery_ — search, a venue's court list, the court a new booking or hold targets — excludes
  archived rows. `findCourtById`, `findCourtsByVenue`, `findVenueSummary` and
  `searchCourtsByProximity` all carry `deleted_at IS NULL`, and so does the sibling court count,
  so an archived court stops being included in "3 courts".
- _Lookup_ — the joins that render an existing booking, on the dashboard or in My bookings — does
  **not** filter. A game played on a court that has since been retired must still be able to
  name it.

`"VenueAmenity"` needs one extra step, because un-ticking and re-ticking an amenity is ordinary
and a tombstone row would make the second tick a primary key violation. Writers revive rather
than insert:

```sql
INSERT INTO "VenueAmenity" (venue_id, amenity_slug) VALUES ($1, $2)
ON CONFLICT (venue_id, amenity_slug) DO UPDATE SET deleted_at = NULL
```

## Pricing

A court's price is a set of rules, and the highest-priority rule matching a given moment wins.
A rule may narrow on weekday, on a time window, and on a date range — each independently, each
optional, so one mechanism covers a standing rate, a weekday evening peak, a public holiday and
a price rise effective next month.

Three rules decide the arguments:

1. **A booking is cut into segments and each is priced on its own.** `resolveQuote` cuts at
   every rule window edge and at local midnight, so a 21:00–23:00 booking crossing a 22:00
   boundary genuinely pays peak for one hour and base for the other. Date-scoped rules needed
   no new cut points — a rule can only start or stop applying at a local midnight, and the
   segmenting already cuts there.
2. **A booking never recomputes its price.** The segments are stored on it as `rate_snapshot`
   at quote time. Editing the rate card cannot change what anyone has already been charged,
   and there must never be a "recalculate" path that makes it possible. The rate at time of
   sale is a different fact from today's rate, not a stale copy of it.
3. **Ambiguity is refused at write time.** Two rules matching the same moment at the same
   priority mean the court has two prices and no rule for choosing. `assertNoRuleConflict`
   rejects the pair on save; `resolveQuote` still breaks ties on id so the existing rows
   behave predictably, but that is a floor, not the answer.

Everything comparing dates or times does so in **venue-local** terms. A holiday rate compared
in UTC moves by up to a day for any venue east of Greenwich, which is all of them.

`member_only` is in the schema and is deliberately **not** offered in the pricing form: every
caller resolves quotes with `isMember: false` until venue passes exist, so such a rule could
never fire. See step 6 of [`docs/BACKEND_PLAN.md`](docs/BACKEND_PLAN.md).

### Writes that are refused

The owner API says no in three places, and each is a case where succeeding quietly is worse
than an error:

| Attempt                                                    | Why it is refused                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A price rule overlapping another at the same priority      | Two prices, no tie-break anyone can explain to a customer                              |
| Opening hours that would leave a sold booking outside them | The venue would have sold a time it no longer admits to being open                     |
| Deleting a court                                           | `"Reservation".court_id` cascades — it would take paid bookings' slots. Courts archive |

Deleting a **price rule** is a real delete, and the only one in the inventory. A rule is a
statement about the future; bookings already sold carry their own snapshot and never read the
table again, so removing one cannot rewrite anything that has happened.

## Reviews

A review is anchored to a booking, never to a venue. `booking_id UNIQUE` is the whole integrity
story: a review must point at a booking, so only somebody who booked can write one, and they can
write exactly one. The write endpoint is `POST /v1/bookings/:bookingId/reviews` for that reason
— a route under the venue would accept a rating from somebody who never played there.

Three rules the service adds on top, all of them in `domain/reviews/canReviewBooking.ts` so the
page and the endpoint cannot disagree:

- **Play must have finished** — the end of the booking, not the start. Rating a game at minute
  one is rating something that has not happened.
- **A cancelled booking cannot be reviewed**, because it was never played. A **no-show can** —
  the player did not turn up, but the venue may still have handled it well or badly.
- **One review per booking**, arbitrated by the constraint rather than a prior SELECT. Two
  submits of the same form race, and check-then-insert loses that race exactly as it does for
  bookings.

Every booking summary reports `canReview` and `hasReview` from that same function, so the form
only appears where it would succeed.

**The average is a view, not a column.** `"VenueRating"` computes it, matching
`"BookingPaymentState"` — an aggregate that is derived cannot drift out of agreement with its
rows, and there is no write path that can forget to update it.

Two things follow from that, and both are load-bearing:

- **An unrated venue has `average: null`, not `0`.** Zero is a rating, and the worst one. Every
  consumer must handle the null, which is what forces "No reviews yet" to be written rather than
  a row of empty stars rendered. `StarRating` returns nothing at all in that case.
- **`sort=rating` puts unrated venues last** (`NULLS LAST`), not below the worst-rated one.

**"Top rated" is derived, never stored** — `TOP_RATED_MIN_AVERAGE` across at least
`TOP_RATED_MIN_REVIEWS`, both in the contract. A stored flag needs a job to keep it true and is
wrong in the window right after a review lands, which is exactly when it matters. The
review-count floor is the half that does the work: on average alone, one five-star review from
the owner's friend outranks a venue with two hundred reviews averaging 4.7.

A review author is shown by first name, or the local part of their email when they have no name
— never the full address. The venue page is public.

## Flex and grid minimums

Two bugs of the same shape have been fixed in this repo, so it is worth stating the rule: **a
flex item and a `1fr` grid track are both floored at their own min-content width**, and content
with `white-space: nowrap` — anything with `truncate` — has a min-content as wide as its whole
text.

The result is that the _sibling_ overflows rather than the offender. A long venue name in a
`truncate` heading pushed the result row's `1fr` track past the row, and the price fell off the
clipped edge; the search bar's cells refused to shrink and pushed the submit button off the
right of a phone screen. Reach for `minmax(0, 1fr)` on the track and `min-w-0` on the flex item.

## Component layering (apps/web)

Atomic design, used as a composition rule rather than a taxonomy to argue about:

```
src/components/
  shadcn/ui/     generated atoms — keep pristine so `shadcn add` can upgrade them
  atoms/         indivisible pieces we own
  molecules/     a few atoms doing one job
  organisms/     a self-contained region of a page
  templates/     page skeletons: slots and spacing, no data
```

**The rule that matters: a layer may only import from layers below it.** An organism composes
molecules and atoms; it never imports another organism. If two organisms need the same block,
that block was a molecule.

Pages under `src/app/` fetch data and compose a template. A page that contains layout maths or
raw markup has taken work that belongs in a component.

### Every component is a directory

```
molecules/Pagination/
  Pagination.tsx      the component, one export
  Pagination.test.tsx colocated, written with the component and not after
  index.ts            barrel, so consumers import '@/components/molecules/Pagination'
```

### Where a new component goes

Ask what it composes, not what it looks like. Then ask who uses it: something only one route
will ever render belongs in that route's own `components/` folder, not in the shared tree.
Promote it when a second route needs it — not in anticipation.

### shadcn

shadcn provides the atoms. Do not hand-roll a primitive it already ships.

Structure, props and slots in `shadcn/ui/` stay as shadcn generates them, so the files can
still be upgraded. **The cva variant class strings are ours to tune**, because the design
system specifies interaction states directly — a hover tint and a pressed state one step along
the accent ramp — and a ramp step is not something a single `--primary` token can express.
`button.tsx` carries that override and says so at the top. Everything else reaches these
components through the tokens in `globals.css`.

Native form controls are not an acceptable substitute. A native `<select>` and
`<input type="date">` submit without JavaScript, but the OS draws their popups and neither
takes any styling: the date panel in particular arrives in stock system blue, and
`::-webkit-calendar-picker-indicator` reaches the icon and nothing else. `molecules/SelectField`
and `molecules/DateField` wrap the shadcn controls instead.

The consequence, stated plainly: **the filter forms now need JavaScript.** Both controls are
client components that mirror their value into a hidden input, so the surrounding
`<form method="GET">` still submits as a plain browser navigation — but with JS off, the
controls do not open and the form submits its defaults.

**One documented exception:** `<input type="datetime-local">` in the venue desk forms. Neither
`SelectField` nor `DateField` covers a date _and_ a time in one field, and splitting it into
two controls that can disagree is worse than an unstyled popup. It stays native until there is
a styled datetime primitive.

### Labels

`FormField` wraps its child in a `<label>` — correct for an `<input>`, wrong for anything built
on Base UI, where a Select is a button that opens a listbox and the `<label>` would associate
the caption with no form element at all. Use `molecules/ControlGroup` for those.

### Styling

Tailwind utilities and design tokens (`bg-card`, `text-muted-foreground`, `text-primary`),
never a raw palette value inside a component. The `@apply` semantic classes that used to live
in `globals.css` are gone; do not add new ones.

## Service boundary

`apps/web` holds no database driver. It reaches Postgres only through `@courte/api` over HTTP
(ADR 0004), and an ESLint rule fails the build if anything imports `pg`. Every call goes
through `src/lib/api/`; nothing else in the web app builds a URL.

## Seed data provenance

Venue names, coordinates and addresses come from OpenStreetMap and are ODbL — the footer
attribution is load-bearing, not decoration. Court composition and all rates are fixtures. See
`db/migrations/20260813200000_reseed_cebu_city_venues.sql`.
