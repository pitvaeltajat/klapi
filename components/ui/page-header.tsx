'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  /** Muted line under the title. */
  description?: React.ReactNode;
  /** Buttons/filters that sit on the title row. */
  actions?: React.ReactNode;
  /**
   * `end` pushes the actions to the far right (page-level buttons); `inline`
   * keeps them next to the title, for things that read as part of it — a status
   * badge, or the loan-list filter chips.
   */
  actionsAlign?: 'end' | 'inline';
}

/**
 * The h1 row every page opens with. Owns its own bottom margin so page rhythm is
 * the same everywhere — the hand-rolled versions disagreed (mb-1/mb-4/mb-6/none)
 * and one edit page had shipped its h1 at h2 size.
 */
export function PageHeader({
  title,
  description,
  actions,
  actionsAlign = 'end',
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-col gap-2', className)} {...props}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {actions && (
          <div
            className={cn(
              'flex flex-wrap items-center gap-2',
              actionsAlign === 'end' && 'sm:ml-auto',
            )}
          >
            {actions}
          </div>
        )}
      </div>
      {description && <p className="text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
