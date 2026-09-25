import { DateTime } from 'luxon';

import { WEEKDAY_LABELS, type Weekday } from '@/consts';

/** ₱1,400.00 from 140000 — money is cents everywhere except the screen. */
export const formatPesos = (cents: number): string =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);

export const formatTime = (date: Date, timezone: string): string =>
  DateTime.fromJSDate(date).setZone(timezone).toFormat('h:mm a');

export const formatDay = (date: Date, timezone: string): string =>
  DateTime.fromJSDate(date).setZone(timezone).toFormat('ccc, d LLL yyyy');

export const formatDistance = (metres: number): string =>
  metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;

/** ₱300 from 30000. For headline rates, where the trailing ".00" is noise. */
export const formatWholePesos = (cents: number): string => `₱${Math.round(cents / 100)}`;

/**
 * "6 AM" from 6. An hour of the day with no date attached — the utilisation chart's axis is
 * about the shape of a trading day, not about any particular one.
 */
export const formatHourLabel = (hour: number): string => {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
};

/**
 * "6:00 PM" from "18:00". A wall-clock time carrying no date and no zone — the search asks for
 * a time of day, and the venue it eventually matches is the thing that owns a timezone.
 */
export const formatClockLabel = (time: string): string => {
  const parsed = DateTime.fromFormat(time, 'HH:mm');
  return parsed.isValid ? parsed.toFormat('h:mm a') : time;
};

/**
 * The wire type says `number` because JSON has no narrower one; the database's CHECK constraint
 * says 0–6. The fallback is therefore unreachable, and exists so a bad row surfaces as a visibly
 * wrong label rather than as `undefined` rendered into the page.
 */
export const formatWeekday = (day: number): string => WEEKDAY_LABELS[day as Weekday] ?? `Day ${day}`;
