# ADR 0002 — Double-booking is prevented by a database constraint

Status: accepted
Date: 2026-08-08

## Context

Two people tapping "book" on the same 7pm court within milliseconds of each other is the defining
failure mode of a booking product. A venue that gets double-booked once stops trusting the
platform, and the platform's entire value proposition is that the slot you see is real.

Application-level checking — read the reservations, see no conflict, insert — is a
check-then-act race. It passes every test written on a single thread and fails under exactly the
load that matters.

## Decision

Overlap prevention lives in the schema, as a Postgres exclusion constraint on `reservations`:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (court_id WITH =, during WITH &&)
  WHERE (state = 'active');
```

Holds, confirmed bookings and blackouts are all rows in `reservations`, so a single constraint
covers all three. A booking that spans several courts inserts several rows in one transaction; if
any one of them overlaps, the whole booking aborts.

Application code catches SQLSTATE `23P01` and maps it to a 409 with a "slot just went" message.
It does not attempt to pre-check.

## Consequences

- The guarantee holds regardless of which code path writes: the booking API, the owner dashboard
  entering a walk-in, the recurrence materialiser, an admin script, or a future service.
- `btree_gist` is required for the `court_id WITH =` component. This ties the project to Postgres,
  which is acceptable and already assumed by PostGIS.
- Buffers between bookings are handled by storing the **blocked** interval in `during` and the
  playable interval in `play_during`, so changeover time is enforced by the same constraint.
- Expired holds still occupy their range until a sweeper releases them. Exclusion constraint
  predicates cannot reference `now()`, so expiry cannot be expressed declaratively. A job runs
  every minute; a slot can therefore appear taken for up to 60 seconds after a hold lapses. This is
  accepted and documented rather than engineered around.

## Alternatives rejected

**`SELECT FOR UPDATE` on the court row** — correct only if every write path remembers to take the
lock, and it serialises all bookings for a court behind one transaction.

**Advisory locks** — same discipline problem, with the added downside of being invisible in the
schema, so nothing reminds a future developer it exists.

**Optimistic concurrency with retry** — acceptable under low contention, which is precisely not
the condition that matters. Peak evening slots are where contention concentrates.
