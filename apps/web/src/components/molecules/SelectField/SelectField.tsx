'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/ui/select';
import { cn } from '@/lib/utils';

export type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  options: SelectOption[];
  /** Omitted for a control that only exists to drive local state rather than to submit. */
  name?: string;
  defaultValue?: string;
  /** Supply with `onValueChange` to drive the control from React state instead. */
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

/**
 * The app's dropdown. shadcn's Select is a Base UI listbox rather than a `<select>`, which is
 * what makes it themeable — a native select's popup is drawn by the OS and takes no styling.
 *
 * Passing `name` is what keeps a surrounding GET or server-action form working: Base UI mirrors
 * the chosen value into a hidden input, so the browser still submits it as an ordinary field.
 * `items` lets the trigger render the option's label rather than its raw value.
 *
 * Uncontrolled by default; pass `value` and `onValueChange` when the page needs to react to the
 * choice (the booking form switches its submit target on the repeat count). Passing both
 * `value` and `defaultValue` is a Base UI error, so `value` wins and defaultValue is dropped.
 */
export const SelectField = ({ name, defaultValue, value, onValueChange, options, className }: SelectFieldProps) => (
  <Select
    name={name}
    items={options}
    {...(value === undefined
      ? { defaultValue }
      : // Base UI reports a cleared selection as null. Nothing here is clearable — there is no
        // clear affordance on the trigger — but the callback still has to be total, and the
        // empty string is already this app's "no filter" value.
        { value, onValueChange: (next: string | null) => onValueChange?.(next ?? '') })}
  >
    <SelectTrigger className={cn('h-10 w-full px-3 text-[13px] font-semibold', className)}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map(option => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
