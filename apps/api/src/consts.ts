/**
 * Postgres raises this SQLSTATE when the reservations exclusion constraint rejects an
 * overlapping range. It is the sole signal that a slot was taken between render and submit —
 * see docs/adr/0002.
 */
export const PG_EXCLUSION_VIOLATION = '23P01';
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';

/**
 * `opening_windows.day_of_week` is 0 = Monday so that a week reads left to right in the
 * dashboard. Luxon's `weekday` is 1 = Monday, so every conversion goes through these rather
 * than an inline `- 1` scattered across the codebase.
 */
export const MONDAY_INDEX = 0;
export const DAYS_PER_WEEK = 7;
export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_WEEK = MINUTES_PER_DAY * DAYS_PER_WEEK;
export const MS_PER_MINUTE = 60_000;
export const HOURS_PER_DAY = 24;

/** How many bookable starts a search card shows before "all times". */
export const SLOT_CHIPS_PER_CARD = 3;

/**
 * Upper bound on the start chips a single court page lists for one day. The cap is per day,
 * not per court, so it has to clear the widest case: a court open around the clock on the
 * finest grid anyone configures. Set too low it truncates in silence — at 32 a court open
 * 06:00 to midnight on a 30-minute grid lost its last two starts with nothing on screen to
 * say so, which reads as "closed early" rather than "list trimmed".
 */
export const FINEST_INCREMENT_MINUTES = 15;
export const MAX_SLOTS_PER_DAY = MINUTES_PER_DAY / FINEST_INCREMENT_MINUTES;

export const API_VERSION_PREFIX = 'v1';

/**
 * Shutdown budget. Long enough to drain a normal booking request, short enough that an
 * orchestrator's own kill timer never beats us to it.
 */
export const SHUTDOWN_TIMEOUT_MS = 30_000;
