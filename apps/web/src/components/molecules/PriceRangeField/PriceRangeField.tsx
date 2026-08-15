'use client';

import { useState } from 'react';

import { PRICE_FILTER_MAX_CENTS, PRICE_FILTER_MIN_CENTS, PRICE_FILTER_STEP_CENTS } from '@courte/contract';

import { Slider } from '@/components/shadcn/ui/slider';
import { formatWholePesos } from '@/lib/format';

type PriceRangeFieldProps = {
  minCents: number;
  maxCents: number;
  /** Fired when the drag ends, not on every pixel — each commit is a new search. */
  onCommit: (range: { minCents: number; maxCents: number }) => void;
};

const toRange = (value: number | readonly number[]): [number, number] => {
  if (!Array.isArray(value)) return [PRICE_FILTER_MIN_CENTS, value as number];
  return [value[0] ?? PRICE_FILTER_MIN_CENTS, value[1] ?? PRICE_FILTER_MAX_CENTS];
};

/**
 * A two-handle range over the shared cent bounds. The top of the travel means "no ceiling"
 * rather than "exactly ₱1,500", which is why the label carries a `+` there — a reader who drags
 * to the end should not wonder whether they have just excluded the expensive courts.
 */
export const PriceRangeField = ({ minCents, maxCents, onCommit }: PriceRangeFieldProps) => {
  const [range, setRange] = useState<[number, number]>([minCents, maxCents]);
  const isOpenEnded = range[1] >= PRICE_FILTER_MAX_CENTS;

  return (
    <div>
      <Slider
        value={range}
        min={PRICE_FILTER_MIN_CENTS}
        max={PRICE_FILTER_MAX_CENTS}
        step={PRICE_FILTER_STEP_CENTS}
        onValueChange={value => setRange(toRange(value))}
        onValueCommitted={value => {
          const [nextMin, nextMax] = toRange(value);
          onCommit({ minCents: nextMin, maxCents: nextMax });
        }}
        aria-label="Price per hour"
      />
      <div className="text-muted-foreground mt-3 flex justify-between text-[11.5px] font-medium">
        <span>{formatWholePesos(range[0])}</span>
        <span>
          {formatWholePesos(range[1])}
          {isOpenEnded ? '+' : ''}
        </span>
      </div>
    </div>
  );
};
