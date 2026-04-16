'use client';

import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Button } from './button';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  value?: number | string;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, min, max, step = 1, className, disabled, ...props }, ref) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : (value ?? 0);

    const clamp = (v: number) => {
      if (typeof min === 'number' && v < min) return min;
      if (typeof max === 'number' && v > max) return max;
      return v;
    };

    const decrement = () => onChange?.(clamp(numericValue - step));
    const increment = () => onChange?.(clamp(numericValue + step));

    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={decrement}
          disabled={disabled || (typeof min === 'number' && numericValue <= min)}
          aria-label="Decrement"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          ref={ref}
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onChange?.(Number.isNaN(parsed) ? 0 : clamp(parsed));
          }}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="text-center"
          {...props}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={increment}
          disabled={disabled || (typeof max === 'number' && numericValue >= max)}
          aria-label="Increment"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  },
);
NumberInput.displayName = 'NumberInput';
