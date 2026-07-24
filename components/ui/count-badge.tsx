'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const countBadgeVariants = cva('flex shrink-0 items-center justify-center rounded-full font-bold', {
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground',
      destructive: 'bg-destructive text-destructive-foreground shadow-md',
    },
    size: {
      sm: 'size-5 text-xs',
      md: 'size-6 text-sm',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'sm',
  },
});

export interface CountBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof countBadgeVariants> {
  count: number;
  /** Pins the badge to the top-right corner of a `relative` parent. */
  floating?: boolean;
}

/** The little number bubble on the cart icon and the filter buttons. */
export function CountBadge({ count, variant, size, floating, className, ...props }: CountBadgeProps) {
  return (
    <span
      className={cn(
        countBadgeVariants({ variant, size }),
        floating && 'absolute -right-3 -top-3',
        className,
      )}
      {...props}
    >
      {count}
    </span>
  );
}

export { countBadgeVariants };
