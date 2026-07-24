'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
}

/** Pill toggle used for the loan-status filters. */
export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ active, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      className={cn(
        'cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition-colors',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background text-muted-foreground hover:bg-accent',
        className,
      )}
      {...props}
    />
  ),
);
FilterChip.displayName = 'FilterChip';
