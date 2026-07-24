'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeClass = {
  default: { box: 'size-4', check: 'size-3' },
  lg: { box: 'size-5', check: 'size-3.5' },
} as const;

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  size?: keyof typeof sizeClass;
}

/**
 * A real `<input type="checkbox">` under a painted box, so it keeps native form
 * and keyboard behaviour while looking the same in dark mode as everywhere else.
 * Replaces eight unstyled raw inputs that each picked their own size.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, size = 'default', ...props }, ref) => {
    const s = sizeClass[size];
    return (
      <span className={cn('relative inline-flex shrink-0', s.box, className)}>
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            'peer h-full w-full cursor-pointer appearance-none rounded-[4px] border border-input bg-background transition-colors',
            'checked:border-primary checked:bg-primary',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          {...props}
        />
        <Check
          aria-hidden
          strokeWidth={3}
          className={cn(
            'pointer-events-none absolute inset-0 m-auto text-primary-foreground opacity-0 peer-checked:opacity-100',
            s.check,
          )}
        />
      </span>
    );
  },
);
Checkbox.displayName = 'Checkbox';

/**
 * The painted box on its own, for rows that are a `<button role="checkbox">`
 * rather than a real input (see CatalogueFilters — the whole row is the touch
 * target). Kept here so both spellings stay visually identical.
 */
export function CheckboxIndicator({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background',
        className,
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}
