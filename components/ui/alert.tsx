'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

// The tinted callout used for "heads up" notes. The border/background opacities
// are fixed per variant on purpose: hand-rolled versions had drifted to eight
// different recipes for what are only four states.
const alertVariants = cva('flex items-start gap-3 rounded-md border p-4 text-sm', {
  variants: {
    variant: {
      info: 'border-primary/30 bg-primary/10',
      warning: 'border-warning/50 bg-warning/10',
      success: 'border-success/50 bg-success/10',
      destructive: 'border-destructive/40 bg-destructive/10',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

const iconClass = {
  info: 'text-primary',
  warning: 'text-warning',
  success: 'text-success',
  destructive: 'text-destructive',
} as const;

const defaultIcon = {
  info: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  destructive: TriangleAlert,
} as const;

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  /** Bold lead line above the body. */
  title?: React.ReactNode;
  /** Custom icon, or `false` for a text-only callout. */
  icon?: React.ReactNode | false;
}

export function Alert({ className, variant, title, icon, children, ...props }: AlertProps) {
  const v = variant ?? 'info';
  const Fallback = defaultIcon[v];

  return (
    <div className={cn(alertVariants({ variant }), className)} {...props}>
      {icon !== false &&
        (icon ?? <Fallback className={cn('mt-0.5 h-5 w-5 shrink-0', iconClass[v])} />)}
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && 'text-muted-foreground')}>{children}</div>}
      </div>
    </div>
  );
}

export { alertVariants };
