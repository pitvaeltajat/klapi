'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface SelectableRowProps extends Omit<React.HTMLAttributes<HTMLLabelElement>, 'onChange'> {
  selected: boolean;
  onSelectedChange: () => void;
  disabled?: boolean;
  /** Bigger hit area + checkbox, for the kiosk's touch screen. */
  size?: 'default' | 'lg';
}

/**
 * A tickable row: the whole thing is the target, and the border goes green when
 * it's picked. Rendered as a `<label>` so the click reaches the checkbox
 * natively — the hand-rolled copies were `<div onClick>` wrappers that each had
 * to stopPropagation on the inner input.
 */
export const SelectableRow = React.forwardRef<HTMLLabelElement, SelectableRowProps>(
  ({ selected, onSelectedChange, disabled, size = 'default', className, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'flex items-center gap-3 rounded-md border transition-colors',
        size === 'lg' ? 'gap-3 p-4' : 'p-3',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/50',
        selected ? 'border-success' : 'border-border',
        className,
      )}
      {...props}
    >
      <Checkbox
        checked={selected}
        onChange={onSelectedChange}
        disabled={disabled}
        size={size === 'lg' ? 'lg' : 'default'}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  ),
);
SelectableRow.displayName = 'SelectableRow';
