import type { Sport } from '@courte/contract';

/**
 * Presentation-only constants. Anything that crosses the wire lives in @courte/contract
 * instead, so the two services cannot disagree about it.
 */

export const SPORT_LABELS: Record<Sport, string> = {
  pickleball: 'Pickleball',
  badminton: 'Badminton',
  basketball: 'Basketball',
  volleyball: 'Volleyball',
  tennis: 'Tennis',
  futsal: 'Futsal',
};

/** Card banner gradients per sport — stands in for venue photography until venues upload it. */
export const SPORT_BANNERS: Record<Sport, string> = {
  pickleball: 'from-court-700 via-court-600 to-emerald-500',
  badminton: 'from-indigo-700 via-blue-600 to-sky-500',
  basketball: 'from-orange-700 via-orange-600 to-amber-500',
  volleyball: 'from-amber-600 via-yellow-500 to-lime-500',
  tennis: 'from-green-800 via-green-700 to-court-500',
  futsal: 'from-teal-800 via-teal-600 to-cyan-500',
};

/** How long a caller token is valid. Minutes, not days — it is minted per request anyway. */
export const API_TOKEN_TTL_SECONDS = 300;

/** Give up on the API rather than holding a page render open indefinitely. */
export const API_TIMEOUT_MS = 10_000;
