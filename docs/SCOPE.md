# Courte v1 — agreed scope

Date: 2026-08-08
Status: scope agreed, pending contract

## In scope

| Capability | Notes |
|---|---|
| Flexible-duration bookings | No fixed slot grid. Per-court min, max and increment. |
| Recurring bookings | RFC 5545 RRULE. Edit this occurrence / this and following / all. |
| Payment tracking | Ledger-derived: unpaid, partial, paid. Cash and on-site methods recorded by staff. |
| Per-court opening hours | Handles 24/7 courts and windows crossing midnight. |
| Walk-in and phone bookings | Entered by staff, indistinguishable to the availability engine. |
| Peak, off-peak and member pricing | Resolved at quote time, snapshotted onto the booking. |
| Cancellation and no-show | Per-venue cancellation window. No-show recorded by staff. |
| Multi-court bookings | Tournaments and leagues. One booking, many courts, atomic. |
| Waitlist | Offers on release, with a claim window. |
| Venue owner dashboard | Courts, hours, blackouts, bookings, occupancy and revenue. |
| Proximity search | PostGIS radius, sport and date filters. |

## Out of scope for v1

| Deferred | Reason |
|---|---|
| Chat between players and venues | A separate product surface with its own moderation and support burden. |
| AI assistant | Depends on chat. Revisit once the booking engine is stable. |
| Native iOS and Android apps | Roughly doubles the build and adds release cycles outside our control. |
| Online payment capture | v1 reserves online, pays at venue. The payment seam is built; the gateway is not. |
| Player matchmaking and social | Not in the brief. |

## Estimate

| Phase | Days |
|---|---|
| Discovery, teardown, architecture | 7–10 |
| Core booking engine | 26–35 |
| Recurring bookings and payment states | 8–12 |
| Per-court opening hours | 2–3 |
| Walk-in capture | 2–3 |
| Peak and member pricing | 4–5 |
| Cancellation and no-show | 3–4 |
| Multi-court bookings | 2–3 |
| Waitlist | 4–6 |
| **Total** | **58–81 days** |

Roughly three to four months solo full-time. Discovery is billed as its own milestone and its
output — the PRD and these ADRs — belongs to the client whether or not the build proceeds.

## Open questions

- Payment gateway for a later phase: Stripe's Philippine coverage is limited, so PayMongo, GCash
  and Maya need pricing and settlement terms confirmed before any payment milestone is quoted.
- Does a recurring series pay per occurrence or upfront for the block?
- Who owns venue onboarding at launch — client-side sales, or self-serve?
