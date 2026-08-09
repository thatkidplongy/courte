# Courte

Court booking for sports venues — flexible durations, recurring series, walk-ins, waitlists,
and a venue owner dashboard. Built as a modular monolith on Next.js and Postgres.

## Architecture

The design decisions live in `docs/` and are the right place to start:

- [docs/SCOPE.md](docs/SCOPE.md) — what v1 is and is not
- [docs/adr/0001-availability-model.md](docs/adr/0001-availability-model.md) — availability is computed on read
- [docs/adr/0002-concurrency-control.md](docs/adr/0002-concurrency-control.md) — double-booking is prevented by the database, not the app
- [docs/adr/0003-service-boundaries.md](docs/adr/0003-service-boundaries.md) — modular monolith, framework-free domain core

The short version: a `bookings` row is intent, a `reservations` row is a physical claim on a
court over a `tstzrange`, and a Postgres exclusion constraint makes overlapping claims
impossible no matter which code path writes. Everything else follows from that split.

## Getting started

```bash
pnpm install
docker compose up -d          # PostGIS-enabled Postgres on port 5433
cp .env.example .env.local    # then fill in AUTH_SECRET and JOB_TRIGGER_SECRET
pnpm db:migrate
pnpm dev
```

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm test` | Unit tests (Vitest, colocated with the domain code) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint, including the domain-boundary rule from ADR 0003 |
| `pnpm db:migrate` / `db:rollback` / `db:status` | dbmate migrations in `db/migrations/` |

## Layout

```
db/migrations/     source of truth for the schema, every migration reversible
docs/              scope, ADRs, schema reference
src/config/        Zod-validated env — the process refuses to boot half-configured
src/consts.ts      shared constants; no magic strings inline
src/db/            pool, transaction helper, repositories (queries only, no logic)
src/domain/        framework-free business logic; ESLint enforces the boundary
src/lib/           logger and cross-cutting helpers
```
