/** Chrome that every page shares, and the one date the policy pages print. */

/**
 * The page gutter, in one place because the header, the footer and every page must agree — a
 * header whose logo does not sit above the first heading is the sort of drift nobody files.
 *
 * The mockups are drawn on a 1440 canvas with 56px sides, which is what `lg:px-14` reproduces
 * exactly at that width. The cap keeps a very wide monitor from stretching a row of cards to
 * the point where the eye has to travel to read one line.
 */
export const PAGE_GUTTER = 'mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-14';

/**
 * The date both policy pages show. Hardcoded rather than derived: it is the day the wording
 * last changed, which no build step can know, and a policy stamped with today's date every
 * time it is deployed tells the reader nothing.
 */
export const LEGAL_UPDATED_ON = '16 August 2026';
