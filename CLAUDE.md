# Courte

Court booking for sports venues — flexible durations, recurring series, walk-ins, waitlists and a
venue owner dashboard. A NestJS API (`apps/api`) and a Next.js app (`apps/web`) in one pnpm
workspace over one Postgres, with a shared `@courte/contract` package between them.

## Read these first

- [`CONVENTIONS.md`](CONVENTIONS.md) — repo rules; takes precedence over `~/Develop/CLAUDE.md`,
  `FRONTEND_STANDARDS.md` and `BACKEND_STANDARDS.md` wherever they overlap.
- [`CLAUDE_GOTCHAS.md`](CLAUDE_GOTCHAS.md) — traps that have already cost real time. Read before
  debugging anything that looks impossible, and add to it when a new one bites.
- [`docs/adr/`](docs/adr) — why the design is what it is. 0001 availability, 0002 concurrency,
  0004 the extracted API service.

## Commands

- `pnpm dev` — both apps in parallel (`dev:api`, `dev:web` to run one)
- `pnpm build` — builds `@courte/contract` first, then the apps
- `pnpm typecheck` — same ordering; contract build is a prerequisite, not an optimisation
- `pnpm test` / `pnpm lint` / `pnpm format`
- `pnpm db:migrate` / `db:rollback` / `db:status` — dbmate against `db/migrations`

## Load-bearing constraints

- **Only `apps/api` holds a database connection.** The web app reaches Postgres exclusively over
  HTTP; an ESLint rule fails the web build if anything imports a driver.
- **A `bookings` row is intent; a `reservations` row is a physical claim** on a court over a
  `tstzrange`. A Postgres exclusion constraint makes overlapping claims impossible regardless of
  which code path writes — never add application-level double-booking checks in place of it.
- **Availability is computed on read**, not stored. See ADR 0001 before caching it.
- **`@courte/contract` is consumed as built output** (`dist/`), so editing its `src` changes
  nothing until you rebuild, and the running API still holds the old copy until it restarts.
- **Postgres is on 5433**, and a Homebrew instance has squatted there before. See the gotchas
  file for how to tell which server answered.
