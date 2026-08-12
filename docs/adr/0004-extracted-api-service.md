# ADR 0004 — Extract the backend into a NestJS API service

Status: accepted
Date: 2026-08-13
Supersedes: [ADR 0003](0003-service-boundaries.md)

## Context

ADR 0003 chose a modular monolith and explicitly rejected "separate NestJS API plus Next
frontend" on operational-cost grounds. That reasoning held for a single developer shipping to a
single client. Three things changed it.

**The connection pool does not survive serverless.** `src/db/client.ts` created a pool sized by
`DATABASE_POOL_MAX` and parked it on `globalThis`. That is correct for a long-lived Node process
and wrong for the deploy target: every warm lambda instance holds its own pool, so twenty
instances at the default of ten is two hundred connections against a Postgres whose default cap
is a hundred. This is structural, not a tuning knob. `BACKEND_STANDARDS.md` prescribes an
external pooler (PgBouncer) for exactly this, and that remains a valid alternative — it was not
chosen because it addresses only this one point of the three.

**A second client cannot consume server actions.** Server actions are a Next-internal transport.
A native player app — the most likely next surface for this product — has nothing to call. Any
second client forces an HTTP API into existence anyway; the only question is whether it arrives
before or after there is production data to migrate.

**Correctness was coupled to a paid cron tier.** `vercel.json` ran `sweep-holds` every minute.
Until that job runs, a lapsed hold still blocks its slot, so slot liveness depended on
serverless cron granularity and on the shared `JOB_TRIGGER_SECRET` protecting the route.

The extraction was done while nothing was deployed and there were no users, which is the
cheapest this move will ever be.

## Decision

One repository, two deployables, one database.

```
apps/api/        NestJS. The only process holding a Postgres connection.
apps/web/        Next.js. Renders and calls the API over HTTP.
packages/contract/  Zod schemas and types both sides import.
db/migrations/   unchanged, still the schema's source of truth
```

**The API is the sole database client.** This is the load-bearing part. A split where the web
app keeps a pool for its own reads pays the entire cost of the extraction and still hits the
original wall. An ESLint rule in `apps/web` fails the build on any import of `pg`, `drizzle-orm`
or `postgres`, because the constraint is invisible otherwise until production.

**The domain core is unchanged.** `src/domain` moved intact — same framework-free rules, same
63 unit tests, same dependency-injected repositories. ADR 0003's real payoff was this seam, and
it is what made the extraction mechanical rather than a rewrite. Its boundary lint moved with
it, now naming Nest and Express instead of Next and React.

**Auth splits along identity versus authorization.** Auth.js v5 stays in the web app and remains
the only thing that talks to Google. During sign-in it calls `POST /v1/identities` with a shared
service key to resolve a verified email into our own user id. Thereafter every API call carries
a per-request HS256 JWT, five-minute expiry, subject = our user id.

No role travels in that token. `BACKEND_STANDARDS.md` defaults to stateful sessions and permits
JWTs given "a concrete horizontal-scaling or mobile/machine-to-machine need"; a service boundary
plus a planned native client is that need. Venue membership is still read from the database on
every request, so revoking a staff member takes effect on their next call rather than when a
token expires.

**Jobs run in-process.** `@nestjs/schedule` replaces Vercel Cron. The three jobs were already
idempotent, and a long-lived process needs neither a shared secret nor an HTTP round trip to run
its own work. `vercel.json` and `JOB_TRIGGER_SECRET` are gone.

## Consequences

- Two deploys, two env files, and a CORS allowlist — the operational cost ADR 0003 named. It is
  real and it is now paid.
- Connection count is bounded by one process's pool regardless of web traffic.
- A native client is additive: the endpoints already exist and carry no Next-shaped assumptions.
- Booking logic deploys without a UI deploy, and vice versa.
- Every read is a network hop that used to be a function call. Search went from two in-process
  queries to one HTTP call wrapping them, which is the shape that keeps it cheap — the API does
  the availability derivation and returns finished chips rather than making the web app assemble
  them.
- A new failure mode: the API being unreachable. `apiFetch` distinguishes it (503,
  `API_UNREACHABLE`) from a domain rejection so it can never be rendered as a form error the
  user could fix.
- The contract package is now a third thing to keep honest. That is the deliberate trade against
  two copies of the same enums drifting apart.

## Alternatives rejected

**PgBouncer in front of the monolith.** Solves the connection wall and nothing else. Correct if
the pool were the only problem; it was the least important of the three.

**Extract writes only, keep RSC reads on their own pool.** Shippable in stages, but two pools
against one database means the connection problem survives until the second phase lands, and the
web app keeps a database dependency the ESLint rule above exists to forbid.

**Serverless functions per operation.** Rejected in ADR 0003 and still rejected: it fragments the
multi-row transactional insert that ADR 0002 depends on.
