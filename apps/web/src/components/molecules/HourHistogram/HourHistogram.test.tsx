import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HourHistogram, type HourBar } from './HourHistogram';

const buildDay = (bookingsByHour: Record<number, number>): HourBar[] =>
  Array.from({ length: 24 }, (_, hour) => ({ hour, bookings: bookingsByHour[hour] ?? 0 }));

const countBars = (container: HTMLElement) => container.querySelectorAll('[title]').length;

describe('HourHistogram', () => {
  it('says so plainly when nothing was booked at all', () => {
    render(<HourHistogram bars={buildDay({})} />);

    expect(screen.getByText('No bookings in the last 30 days.')).toBeInTheDocument();
  });

  it('widens a single busy hour rather than stretching one bar across the chart', () => {
    const { container } = render(<HourHistogram bars={buildDay({ 20: 3 })} />);

    expect(countBars(container)).toBe(8);
  });

  it('trims the dead hours off a normal trading day', () => {
    const { container } = render(<HourHistogram bars={buildDay({ 6: 1, 7: 4, 18: 9, 19: 6, 20: 2 })} />);

    // 6am through 8pm inclusive, with midnight-to-5am and 9pm-onward dropped.
    expect(countBars(container)).toBe(15);
  });

  it('names the hour and its count, so a bar is readable without a legend', () => {
    render(<HourHistogram bars={buildDay({ 18: 1, 19: 4 })} />);

    expect(screen.getByTitle('6 PM — 1 booking')).toBeInTheDocument();
    expect(screen.getByTitle('7 PM — 4 bookings')).toBeInTheDocument();
  });

  it('keeps the padded window inside the day when the busy hour is late', () => {
    const { container } = render(<HourHistogram bars={buildDay({ 23: 2 })} />);

    expect(countBars(container)).toBe(8);
    expect(screen.getByTitle('11 PM — 2 bookings')).toBeInTheDocument();
  });
});
