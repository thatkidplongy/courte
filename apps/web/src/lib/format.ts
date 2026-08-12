import { DateTime } from 'luxon';

/** ₱1,400.00 from 140000 — money is cents everywhere except the screen. */
export const formatPesos = (cents: number): string =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);

export const formatTime = (date: Date, timezone: string): string =>
  DateTime.fromJSDate(date).setZone(timezone).toFormat('h:mm a');

export const formatDay = (date: Date, timezone: string): string =>
  DateTime.fromJSDate(date).setZone(timezone).toFormat('ccc, d LLL yyyy');

export const formatDistance = (metres: number): string =>
  metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;
