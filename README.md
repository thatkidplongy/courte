# Courte

Court booking for sports venues — flexible durations, recurring series, walk-ins, waitlists,
and a venue owner dashboard. A NestJS API and a Next.js web app in one repository, over one
Postgres.

## Architecture

The design decisions live in `docs/` and are the right place to start:

- [docs/SCOPE.md](docs/SCOPE.md) — what v1 is and is not
- [docs/adr/0001-availability-model.md](docs/adr/0001-availability-model.md) — availability is computed on read
- [docs/adr/0002-concurrency-control.md](docs/adr/0002-concurrency-control.md) — double-booking is prevented by the database, not the app
- [docs/adr/0003-service-boundaries.md](docs/adr/0003-service-boundaries.md) — the original monolith decision, superseded
- [docs/adr/0004-extracted-api-service.md](docs/adr/0004-extracted-api-service.md) — why the backend is now its own service

The short version: a `bookings` row is intent, a `reservations` row is a physical claim on a
court over a `tstzrange`, and a Postgres exclusion constraint makes overlapping claims
impossible no matter which code path writes. Everything else follows from that split.

The second load-bearing rule is that **only `apps/api` holds a database connection**. The web
app reaches Postgres exclusively over HTTP, and an ESLint rule fails its build if anything
imports a driver — the constraint is invisible otherwise until production.

## Getting started

```bash
pnpm install
docker compose up -d                     # PostGIS-enabled Postgres on port 5433
cp .env.example .env                     # dbmate only
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate
pnpm dev                                 # both services
```

`API_JWT_SECRET` and `API_SERVICE_KEY` are shared secrets and must be byte-identical in both
`.env.local` files. Generate each with `openssl rand -base64 32`.

The API listens on `:4000`, the web app on `:3000`. Interactive API docs are at
`http://localhost:4000/docs` outside production.

## Seed data

Six real Cebu City venues, 17 courts. Venue names, coordinates, streets and — for three of
them — opening hours come from OpenStreetMap via Overpass, with Nominatim filling in the
addresses OSM had no `addr:street` for. That data is ODbL, so the footer carries the
attribution and it must stay there. Court composition and every rate are fixtures: OSM models
neither bookable courts nor prices, so nothing in the seed is a real price list for a real
business. [The migration](db/migrations/20260813200000_reseed_cebu_city_venues.sql) says which
fields are which.

The search origin is Fuente Osmeña Circle, deliberately a landmark rather than a venue, so no
result ever reports a distance of zero.

## Commands

| Command                                         | What it does                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                                      | Both services in parallel                                         |
| `pnpm dev:api` / `pnpm dev:web`                 | One at a time                                                     |
| `pnpm test`                                     | Unit tests (Vitest, colocated with the domain code in `apps/api`) |
| `pnpm typecheck`                                | `tsc --noEmit` across every workspace                             |
| `pnpm lint`                                     | ESLint, including both boundary rules                             |
| `pnpm build`                                    | Contract, then both apps                                          |
| `pnpm db:migrate` / `db:rollback` / `db:status` | dbmate migrations in `db/migrations/`                             |

## Layout

```
apps/api/            NestJS. The only process with a Postgres pool.
  src/config/        Zod-validated env — the process refuses to boot half-configured
  src/common/        validation pipe, error filter, request context, auth guards
  src/db/            pool, transaction helper, repositories (queries only, no logic)
  src/domain/        framework-free business logic; ESLint enforces the boundary
  src/modules/       controllers and services per resource
  src/jobs/          hold sweeper, horizon extender, waitlist offers
apps/web/            Next.js. Renders; holds no database connection.
  src/lib/api/       the single door to the API — every call goes through it
  src/server-actions/ form adapters; they validate nothing the API re-validates
packages/contract/   Zod schemas and types both services import
db/migrations/       source of truth for the schema, every migration reversible
docs/                scope, ADRs, schema reference, manual QA
```

## API surface

Versioned under `/v1`, plural resources, camelCase payloads, `{ code, message, errors }` on
every failure. `/health` sits outside the version prefix and runs a real query.

`GET /v1/courts` is the marketplace query. Every filter it accepts — `sport`, `setting`,
`maxRatePerHourCents`, `sort`, `radiusMetres`, `date` — is resolved in SQL, including the
cheapest public rate. That is not an optimisation: a filter applied after the page came back
would leave `total` describing one set of courts and `data` another, and the pager would offer
pages that do not exist. Omitting `sport` means every sport.

| Method       | Path                              | Auth                  |
| ------------ | --------------------------------- | --------------------- |
| `GET`        | `/v1/courts`                      | public                |
| `GET`        | `/v1/courts/:courtId`             | public                |
| `POST`       | `/v1/holds`                       | bearer                |
| `GET`        | `/v1/bookings`                    | bearer                |
| `GET`        | `/v1/bookings/:bookingId`         | bearer                |
| `POST`       | `/v1/bookings/:bookingId/confirm` | bearer                |
| `POST`       | `/v1/bookings/:bookingId/cancel`  | bearer                |
| `POST`       | `/v1/series`                      | bearer                |
| `GET` `POST` | `/v1/waitlist-entries`            | bearer                |
| `GET`        | `/v1/venues/memberships`          | bearer                |
| `GET`        | `/v1/venues/:venueId/dashboard`   | bearer + venue member |
| `POST`       | `/v1/venues/:venueId/walk-ins`    | bearer + venue member |
| `POST`       | `/v1/venues/:venueId/blackouts`   | bearer + venue member |
| `POST`       | `/v1/venues/:venueId/payments`    | bearer + venue member |
| `POST`       | `/v1/identities`                  | service key           |
