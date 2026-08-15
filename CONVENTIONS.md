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

Star ratings, review counts and "top rated" have **no data behind them** — there is no reviews
table yet. They are left out rather than mocked, because a fabricated 4.9 next to a real
venue's name is a lie with that venue's name attached. Same reasoning for the venue nav: the
rail lists Overview alone because the other six sections in the mockup have no route.

Two more, for the record: the dashboard has no period-over-period deltas and no revenue time
series (both need aggregate queries that do not exist yet), and the booking summary panel shows
an hourly rate rather than a total, because the total is resolved server-side at checkout where
a booking crossing a peak boundary is priced per segment.

Amenities, the third "Covered" surface and venue photos **are** built now — see
[`docs/BACKEND_PLAN.md`](docs/BACKEND_PLAN.md) for what remains. No venue has uploaded a photo,
so `VenueImage` falls back to the sport's glyph; there is no upload path, and a photo URL that
404s currently renders as blank space rather than falling back, because catching that needs an
onError handler and therefore a client component.

## Soft delete

Nothing in the inventory is hard-deleted. `venues`, `courts`, `venue_photos`, `amenities` and
`venue_amenities` each carry `deleted_at timestamptz`: NULL is live, a timestamp is archived.

This is not a preference. `reservations.court_id` cascades on delete, so a real `DELETE` of a
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

`venue_amenities` needs one extra step, because un-ticking and re-ticking an amenity is ordinary
and a tombstone row would make the second tick a primary key violation. Writers revive rather
than insert:

```sql
INSERT INTO venue_amenities (venue_id, amenity_slug) VALUES ($1, $2)
ON CONFLICT (venue_id, amenity_slug) DO UPDATE SET deleted_at = NULL
```

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
