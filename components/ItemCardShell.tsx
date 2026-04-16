'use client';

import React from 'react';
import NextLink from 'next/link';
import { LuTriangleAlert } from 'react-icons/lu';
import type { Announcement } from '@prisma/client';
import { cn } from '@/lib/utils';

interface ItemCardShellProps {
  name: string;
  imageSrc: string;
  placeholder: string;
  subtitle: React.ReactNode;
  categoryLine?: string;
  announcements?: Announcement[] | null;
  /**
   * If provided, the whole card is a NextLink to this href. Otherwise the
   * card is a plain div and the caller wires onClick.
   */
  href?: string;
  onClick?: () => void;
  /** Optional action area rendered at the bottom (pushed down with mt-auto). */
  action?: React.ReactNode;
  /**
   * Action area click handler — stops propagation so clicking the controls
   * doesn't bubble to the card-level click that navigates to the detail page.
   */
  onActionPointerDown?: (e: React.MouseEvent | React.PointerEvent) => void;
}

const shellClasses =
  'relative flex overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all sm:flex-col sm:shadow-lg sm:hover:z-10 sm:hover:scale-[1.01] sm:hover:shadow-2xl';

export default function ItemCardShell({
  name,
  imageSrc,
  placeholder,
  subtitle,
  categoryLine,
  announcements,
  href,
  onClick,
  action,
  onActionPointerDown,
}: ItemCardShellProps) {
  const Inner = (
    <>
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted sm:aspect-[5/3] sm:w-full">
        <img
          src={imageSrc}
          alt={`Picture of ${name}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholder;
          }}
          className="h-full w-full object-cover object-center"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-5">
        <p
          className="truncate text-base font-semibold leading-tight sm:text-2xl"
          title={name}
        >
          {name}
        </p>

        <div className="text-sm font-semibold sm:mt-1 sm:text-base">{subtitle}</div>

        {categoryLine !== undefined && (
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{categoryLine}</p>
        )}

        {Array.isArray(announcements) && announcements.length > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-destructive sm:text-sm">
            <LuTriangleAlert className="shrink-0" />
            <span className="truncate">Sisältää ilmoituksen</span>
          </div>
        )}

        {action && (
          <div
            className="mt-auto pt-2 sm:pt-0"
            onClick={onActionPointerDown}
            onMouseDown={onActionPointerDown}
          >
            {action}
          </div>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <NextLink href={href} className={shellClasses}>
        {Inner}
      </NextLink>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(shellClasses, onClick && 'cursor-pointer')}
    >
      {Inner}
    </div>
  );
}
