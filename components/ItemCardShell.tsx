'use client';

import React from 'react';
import NextLink from 'next/link';
import { Info, TriangleAlert } from 'lucide-react';
import { AnnouncementKind, type Announcement } from '@prisma/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cardVariants } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ItemCardShellProps {
  name: string;
  imageSrc?: string;
  placeholder?: string;
  /**
   * Renders in place of the photo, keeping the same box. Used by the "valmiit
   * setit" cards, which stand for a list of items rather than one thing with a
   * picture.
   */
  media?: React.ReactNode;
  /**
   * While true the image box renders as a pulsing skeleton instead of the
   * image — used until the image probe resolves so we never flash the
   * "Ei kuvaa" placeholder during loading.
   */
  loading?: boolean;
  subtitle?: React.ReactNode;
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
  /**
   * Compact mode keeps the always-horizontal "mobile" layout (image left,
   * content right) at every breakpoint and uses a smaller image — used in the
   * cart drawer where the card lives in a narrow column.
   */
  compact?: boolean;
  /**
   * Optional control pinned to the top-right corner (e.g. a remove button).
   */
  cornerAction?: React.ReactNode;
  /** Extra classes on the card itself (e.g. dimming an unavailable item). */
  className?: string;
}

export default function ItemCardShell({
  name,
  imageSrc,
  placeholder,
  media,
  loading = false,
  subtitle,
  categoryLine,
  announcements,
  href,
  onClick,
  action,
  onActionPointerDown,
  compact = false,
  cornerAction,
  className,
}: ItemCardShellProps) {
  const shellClasses = cn(
    cardVariants({ padding: 'none' }),
    'relative flex overflow-hidden',
    !compact &&
      'transition-all sm:flex-col sm:shadow-lg sm:hover:z-10 sm:hover:scale-[1.01] sm:hover:shadow-2xl',
    className,
  );
  // Removed huomiot shouldn't surface on the card — only live ones.
  const activeAnnouncements = Array.isArray(announcements)
    ? announcements.filter((a) => !a.expiresAt || new Date(a.expiresAt) > new Date())
    : [];

  // A fault is a warning; a heads-up is not. The card used to shout both in red,
  // which trained people to ignore the red.
  const hasFault = activeAnnouncements.some((a) => a.kind === AnnouncementKind.KORJATTAVAA);
  const NoticeIcon = hasFault ? TriangleAlert : Info;

  const Inner = (
    <>
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-muted',
          loading && 'animate-pulse',
          compact ? 'aspect-square w-20' : 'aspect-square w-28 sm:aspect-5/3 sm:w-full',
        )}
      >
        {media ??
          (!loading && imageSrc && (
            /* eslint-disable-next-line @next/next/no-img-element -- dynamic S3 URL with onError fallback */
            <img
              src={imageSrc}
              alt={`Picture of ${name}`}
              onError={(e) => {
                if (placeholder) (e.currentTarget as HTMLImageElement).src = placeholder;
              }}
              className="h-full w-full object-cover object-center"
            />
          ))}
      </div>

      <div className={cn('flex min-w-0 flex-1 flex-col', compact ? 'p-2.5' : 'p-3 sm:p-4 xl:p-3')}>
        <p
          className={cn(
            'truncate font-semibold leading-tight',
            compact ? 'text-sm' : 'text-base sm:text-lg xl:text-base',
            cornerAction && 'pr-6',
          )}
          title={name}
        >
          {name}
        </p>

        {subtitle !== undefined && (
          <div className="text-sm font-semibold sm:mt-0.5 sm:text-sm">{subtitle}</div>
        )}

        {categoryLine !== undefined && (
          <p className="truncate text-xs text-muted-foreground sm:text-xs">{categoryLine}</p>
        )}

        {activeAnnouncements.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'mt-1 flex w-fit max-w-full items-center gap-1 text-xs font-semibold',
                  hasFault ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                <NoticeIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {hasFault ? 'Korjattavaa' : 'Huomioitavaa'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent
              className={cn(
                'max-w-xs whitespace-pre-wrap text-sm',
                hasFault && 'bg-destructive text-destructive-foreground',
              )}
            >
              <div className="flex flex-col gap-2">
                {activeAnnouncements.map((a) => (
                  <p key={a.id}>{a.message}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {action && (
          <div
            className={cn('mt-auto', compact ? 'pt-1.5' : 'pt-2 sm:pt-0')}
            onClick={onActionPointerDown}
            onMouseDown={onActionPointerDown}
          >
            {action}
          </div>
        )}
      </div>

      {cornerAction && (
        <div
          className="absolute right-1.5 top-1.5 z-10"
          onClick={onActionPointerDown}
          onMouseDown={onActionPointerDown}
        >
          {cornerAction}
        </div>
      )}
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
