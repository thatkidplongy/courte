'use client';

import { useState } from 'react';

import { CalendarIcon } from 'lucide-react';
import { DateTime } from 'luxon';

import { Button } from '@/components/shadcn/ui/button';
import { Calendar } from '@/components/shadcn/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/ui/popover';
import { cn } from '@/lib/utils';

type DateFieldProps = {
  name: string;
  defaultValue: string;
  /** Replaces the trigger's own chrome — the compact search bar draws the border itself. */
  triggerClassName?: string;
};

const toIsoDate = (date: Date): string => DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');

/**
 * The one control in the filter bar that earns a client boundary.
 *
 * `<input type="date">` submits perfectly without JavaScript, but its calendar panel is drawn
 * by the browser and is not styleable — not the header, not the selected-day colour, nothing.
 * `::-webkit-calendar-picker-indicator` reaches the little icon and stops there. So a native
 * date field means a stock blue OS calendar dropping out of a green product, and no amount of
 * CSS changes that.
 *
 * The hidden input is what keeps the surrounding GET form honest: the calendar is just a way
 * to write to it, and the form still submits as a plain browser navigation.
 */
export const DateField = ({ name, defaultValue, triggerClassName }: DateFieldProps) => {
  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const selected = DateTime.fromISO(value);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn('h-10 w-full justify-between px-3 text-[13px] font-semibold', triggerClassName)}
            >
              {selected.isValid ? selected.toFormat('d LLL yyyy') : 'Pick a date'}
              <CalendarIcon className="text-muted-foreground size-4" />
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected.isValid ? selected.toJSDate() : undefined}
            defaultMonth={selected.isValid ? selected.toJSDate() : undefined}
            onSelect={date => {
              if (!date) return;
              setValue(toIsoDate(date));
              setIsOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </>
  );
};
