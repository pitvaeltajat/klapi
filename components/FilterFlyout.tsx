'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { CountBadge } from '@/components/ui/count-badge';
import { cn } from '@/lib/utils';

/**
 * The catalogue's filters, parked off the left edge of the screen on wide
 * screens. Only a narrow tab shows until you hover it (or tab into it), so the
 * item grid keeps the full centred page width instead of paying for a rail that
 * is idle most of the time.
 *
 * Clicking the tab pins it open, for pointers that can't hover; the pinned panel
 * has its own close button. Below `lg` this renders nothing — the "Suodata"
 * bottom sheet covers that case.
 */
export default function FilterFlyout({
  badge = 0,
  children,
}: {
  /** How many categories are picked — shown on the tab so the state is legible while closed. */
  badge?: number;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;

  return (
    <div
      className="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false);
      }}
    >
      <button
        type="button"
        aria-label="Näytä suodattimet"
        onClick={() => setPinned(true)}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-r-lg border border-l-0 bg-background/95 px-2 py-4 shadow-md backdrop-blur-xs transition-opacity duration-200 hover:bg-muted motion-reduce:transition-none',
          open && 'pointer-events-none opacity-0',
        )}
      >
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        {badge > 0 && <CountBadge count={badge} />}
      </button>

      <div
        // Parked one panel-width to the left of the viewport while closed, so it
        // costs the grid nothing and never shows a sliver.
        className={cn(
          'absolute left-0 top-1/2 max-h-[80vh] w-64 -translate-y-1/2 overflow-y-auto rounded-r-lg border border-l-0 bg-background p-4 shadow-xl transition-transform duration-200 motion-reduce:transition-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        inert={!open}
      >
        {pinned && (
          <button
            type="button"
            aria-label="Sulje suodattimet"
            onClick={() => {
              setPinned(false);
              setHovered(false);
            }}
            className="absolute right-2 top-2 cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
