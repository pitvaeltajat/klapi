'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './input';
import { cn } from '@/lib/utils';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onValueChange: (value: string) => void;
  /** aria-label for the clear button — say what is being cleared. */
  clearLabel?: string;
}

/**
 * A text filter with the magnifier that turns into a clear button once
 * something is typed. The catalogue had this inline; the loan list and the user
 * table wanted the same thing, and three copies of a positioned icon is how the
 * next one ends up subtly different.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, clearLabel = 'Tyhjennä haku', className, ...props }, ref) => (
    <div className="relative">
      <Input
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn('h-9 pr-9', className)}
        {...props}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {value ? (
          <X
            role="button"
            aria-label={clearLabel}
            className="h-4 w-4 cursor-pointer"
            onClick={() => onValueChange('')}
          />
        ) : (
          <Search aria-hidden className="h-4 w-4" />
        )}
      </div>
    </div>
  ),
);
SearchInput.displayName = 'SearchInput';
