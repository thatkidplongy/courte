/** How the web app talks to @courte/api, and what it says when a request cannot be trusted. */

/**
 * An hour. The catalogue is the one read on the search page that is not availability, and a
 * newly added amenity being an hour late is not a booking anyone loses.
 */
export const AMENITY_CACHE_SECONDS = 3600;

/** How long a caller token is valid. Minutes, not days — it is minted per request anyway. */
export const API_TOKEN_TTL_SECONDS = 300;

/** Give up on the API rather than holding a page render open indefinitely. */
export const API_TIMEOUT_MS = 10_000;

/**
 * What a form says when an id field fails to parse. Every id in a form is hidden or comes from
 * a select this app rendered, so reaching this means the page is stale or the field was
 * tampered with — neither of which the reader can fix by editing what they can see.
 */
export const MALFORMED_ID_ERROR = 'That form is out of date. Reload the page and try again.';
