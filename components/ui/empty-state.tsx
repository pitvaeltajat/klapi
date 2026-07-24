'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * `card` is the standalone "this whole list is empty" box. `inline` is the one
   * line of muted text used inside a panel that has other content around it.
   */
  variant?: 'card' | 'inline';
  /** Optional glyph above the title. Card variant only. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** Secondary line under the title. */
  description?: React.ReactNode;
  /** Call to action rendered below the text. */
  action?: React.ReactNode;
}

export function EmptyState({
  variant = 'card',
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <p className={cn('text-sm italic text-muted-foreground', className)} {...props}>
        {title}
      </p>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border bg-muted p-8 text-center',
        className,
      )}
      {...props}
    >
      {icon && <div className="text-muted-foreground [&>svg]:h-8 [&>svg]:w-8">{icon}</div>}
      <p className="text-lg text-muted-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
