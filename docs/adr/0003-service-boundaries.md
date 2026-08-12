# ADR 0003 — Modular monolith with a framework-free domain core

Status: superseded by [ADR 0004](0004-extracted-api-service.md) on 2026-08-13
Date: 2026-08-08

> The deployment decision below no longer holds: the backend now runs as its own NestJS
> service. The framework-free domain core does hold, and moved to `apps/api/src/domain`
> unchanged — the seam this ADR argued for is exactly what made that move mechanical. ADR 0004
> records what changed and why the cost calculation below came out differently.

## Context

Courte v1 ships two roles out of one product: players who search and book, and venue staff who
manage courts, hours, walk-ins and cancellations. It is built and maintained by one developer under
a fixed-scope engagement, and handed to a client who must be able to run it without that developer.

## Decision

One Next.js 15 application, one deploy target, one database.

Inside it, `src/domain/` is framework-free: it imports nothing from Next, no request objects, no
ORM models leaking outward. It exposes plain functions over plain types. Route handlers and server
actions are thin adapters that parse input, call a domain function, and shape a response.

```
src/
  domain/
    booking/        quote, hold, confirm, cancel, no-show
    availability/   getAvailability() — the ADR 0001 seam
    recurrence/     RRULE expansion, series split, horizon materialisation
    pricing/        rule resolution and snapshotting
    waitlist/       matching and offers
  db/               drizzle schema, migrations, raw SQL for constraints
  app/              routes, server actions, UI
  jobs/             hold sweeper, horizon extender, waitlist offers, reminders
```

## Consequences

- The domain is unit-testable with Vitest and no server, no HTTP, no framework harness. This is the
  main reason for the boundary: the booking rules are the part that must be provably correct.
- One deploy keeps operational surface small, which matters for handover to a non-technical client.
- Jobs run on Vercel Cron hitting protected route handlers, so there is no second runtime to
  operate.
- If the booking engine ever needs to be extracted into its own service, the seam already exists
  and no caller changes.
- The cost is discipline: nothing prevents a developer importing Drizzle into a component. Enforced
  by an ESLint boundary rule rather than by convention.

## Alternatives rejected

**Separate NestJS API plus Next frontend** — two deploys, two sets of environment config, CORS and
auth token plumbing, for a single developer and one client. The isolation it buys is available from
a folder boundary at a fraction of the operational cost.

**Serverless functions per operation** — fragments the domain logic across deployment units and
makes the multi-row transactional booking insert (ADR 0002) harder to keep coherent.
