'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  /** Muted line under the title. */
  description?: React.ReactNode;
  /** Buttons, filters or badges. They get their own row under the title. */
  actions?: React.ReactNode;
}

/**
 * The h1 row every page opens with. Owns its own bottom margin so page rhythm is
 * the same everywhere — the hand-rolled versions disagreed (mb-1/mb-4/mb-6/none)
 * and one edit page had shipped its h1 at h2 size.
 *
 * The title always gets a row to itself and the actions sit on the next one.
 * Sharing the row cost the h1 its width — a long loan description wrapped to
 * three lines to leave a badge room — and on a phone they wrapped apart anyway,
 * so the two-row shape is what the pages mostly rendered as regardless.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn('mb-4 flex flex-col gap-2 sm:mb-6', className)} {...props}>
      <h1 className="text-2xl font-semibold break-words sm:text-3xl">{title}</h1>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      {description && <p className="text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
