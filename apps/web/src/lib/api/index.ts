/**
 * One function per endpoint, named for what the page is asking rather than for the verb and
 * path. Pages import from here; nothing else in the app constructs a URL.
 *
 * Split by the API's own modules rather than by screen, so a change to one service's surface
 * touches one file. Reads pass `revalidate: 0` throughout — availability is the product, and a
 * cached chip that has already been booked is worse than a slower page.
 *
 * Every module carries `import 'server-only'` in its own right, so the guard holds whether a
 * caller reaches for the barrel or for one module directly.
 */
export * from './bookings';
export * from './courts';
export * from './identities';
export * from './inventory';
export * from './reviews';
export * from './venues';
export * from './waitlist';
