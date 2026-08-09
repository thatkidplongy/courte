# ADR 0001 — Availability is computed on read, not materialised

Status: accepted
Date: 2026-08-08

## Context

Courte sells time on courts. Every screen in the product asks some version of "what is free?",
so how availability is represented is the decision the rest of the schema hangs off.

The client confirmed two requirements that constrain this heavily:

- Bookings are **flexible duration**, not a fixed hourly grid. Badminton runs 90 minutes, futsal
  runs 60, and disruptions mean start times shift.
- Opening hours vary per court and per sport. Pickleball courts run 24 hours; badminton runs
  10:00 to midnight. Some windows cross midnight, some never close.

Three options were considered.

## Decision

Availability is **derived at query time** from `opening_windows` minus active `reservations`.
No table stores "free slots".

The derivation lives behind a single `getAvailability(courtIds, range)` function. Nothing else in
the codebase queries `opening_windows` or `reservations` directly to answer an availability
question.

## Consequences

- Changing a court's hours takes effect instantly. There is nothing to regenerate and nothing to
  drift out of sync.
- Arbitrary durations work natively, because availability is a set of ranges rather than a set of
  rows on a grid.
- The search page is the performance risk: it asks for availability across many courts at once.
  Mitigated with a single lateral join rather than a query per venue. Measured in slice 3.
- If search latency becomes a problem, a write-through read model can be introduced behind
  `getAvailability()` without touching any caller. This is the reason for the seam.

## Alternatives rejected

**Materialised slots** — a pre-generated row per bookable slot. Rejected because it forces a fixed
grid, which contradicts the flexible-duration requirement outright. It also grows as
courts × days × slots and requires regeneration whenever hours change.

**Write-through read model** — availability recomputed into a per-court-per-day cache on every
write. Rejected for v1 as premature: it adds cache-invalidation failure modes before there is any
evidence of a read bottleneck. Retained as the documented upgrade path.
