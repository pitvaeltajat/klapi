'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ItemCardShell from './ItemCardShell';
import TemplateDialog from './TemplateDialog';
import { ITEM_GRID_CLASSES } from './ItemGrid';
import { useTemplates } from '@/hooks/useTemplates';
import type { TemplateView } from '@/types';

/**
 * How many set cards to reserve space for before the fetch answers. The real
 * count is remembered from the previous visit — the sets change maybe twice a
 * year, so after the first load the placeholder is exactly the right height and
 * the grid below never moves. `0` is a meaningful value (a troop with no sets
 * reserves nothing), hence the null-vs-number distinction.
 */
const COUNT_KEY = 'klapi.templateCount';
const FALLBACK_COUNT = 3;

/** The count never changes mid-visit, so there is nothing to subscribe to. */
const noSubscribe = () => () => {};

function readRememberedCount(): number | null {
  try {
    const raw = window.localStorage.getItem(COUNT_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 24 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Mirrors a set card's box model line for line — same image box, same three
 * text rows at the same font sizes, same button height — so swapping in the
 * real cards doesn't change the section's height by even a few pixels. The
 * `1lh` bars take their height from the row's own line-height, which is why
 * each one is wrapped in a div carrying the text class it stands in for.
 */
function TemplateCardSkeleton() {
  return (
    <Card padding="none" className="relative flex overflow-hidden sm:flex-col sm:shadow-lg">
      <Skeleton className="aspect-square w-28 shrink-0 rounded-none sm:aspect-5/3 sm:w-full" />
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4 xl:p-3">
        <div className="text-base leading-tight sm:text-lg xl:text-base">
          <Skeleton className="h-[1lh] w-2/3" />
        </div>
        <div className="text-sm sm:mt-0.5">
          <Skeleton className="h-[1lh] w-1/3" />
        </div>
        <div className="text-xs">
          <Skeleton className="h-[1lh] w-1/2" />
        </div>
        <div className="mt-auto pt-2 sm:pt-0">
          <Skeleton className="h-11 w-full sm:mt-3" />
        </div>
      </div>
    </Card>
  );
}

/**
 * The "valmiit setit" band above the catalogue: pre-picked sets shown as cards
 * the same size and shape as the item cards, then a rule separating them from
 * the items themselves.
 *
 * Renders nothing when there are no usable sets — an empty heading and divider
 * would just eat the top of the grid. A set whose items have all been archived
 * is dropped rather than opening onto an empty modal.
 *
 * The sets arrive over their own fetch, after the catalogue below them has
 * already painted, so until they land the band renders as placeholder cards of
 * the same height. Without them the whole grid jumps down the moment the sets
 * appear.
 */
export default function TemplateSection() {
  const { templates, loading } = useTemplates();
  const [active, setActive] = useState<TemplateView | null>(null);
  // Read through useSyncExternalStore rather than during render: the server
  // snapshot is `null`, so SSR and hydration agree on the fallback count and
  // React swaps in the remembered one right after, with no DOM mismatch.
  const remembered = useSyncExternalStore(noSubscribe, readRememberedCount, () => null);

  const usable = templates.filter((template) => template.items.length > 0);

  useEffect(() => {
    if (loading) return;
    try {
      window.localStorage.setItem(COUNT_KEY, String(usable.length));
    } catch {
      // Storage blocked or full — the placeholder just falls back to a guess.
    }
  }, [loading, usable.length]);

  const placeholderCount = remembered ?? FALLBACK_COUNT;
  const showSkeleton = loading && placeholderCount > 0;

  if (!showSkeleton && usable.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Layers className="size-5 shrink-0 text-primary" aria-hidden />
          Valmiit setit
        </h2>
        <p className="text-sm text-muted-foreground">
          Valmiiksi kasattu kamalista, jota voit muokata ennen lisäystä
        </p>
      </div>

      <div className={ITEM_GRID_CLASSES} aria-busy={showSkeleton}>
        {showSkeleton
          ? Array.from({ length: placeholderCount }).map((_, i) => <TemplateCardSkeleton key={i} />)
          : usable.map((template) => (
              <ItemCardShell
                key={template.id}
                name={template.name}
                media={
                  <div className="flex h-full w-full items-center justify-center bg-primary/10">
                    <Layers className="size-8 text-primary/70" aria-hidden />
                  </div>
                }
                subtitle={
                  <span className="text-muted-foreground">
                    {template.items.length} {template.items.length === 1 ? 'kama' : 'kamaa'}
                  </span>
                }
                categoryLine={template.description ?? undefined}
                onClick={() => setActive(template)}
                action={
                  <Button className="h-11 w-full gap-2 text-base sm:mt-3 sm:h-11 sm:text-base">
                    Valitse setti
                  </Button>
                }
              />
            ))}
      </div>

      <hr className="mt-6" />

      {active && (
        // Keyed so switching sets remounts with freshly seeded amounts instead
        // of carrying the previous one's numbers over.
        <TemplateDialog key={active.id} template={active} onClose={() => setActive(null)} />
      )}
    </section>
  );
}
