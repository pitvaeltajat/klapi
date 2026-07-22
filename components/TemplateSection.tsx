'use client';

import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ItemCardShell from './ItemCardShell';
import TemplateDialog from './TemplateDialog';
import { ITEM_GRID_CLASSES } from './ItemGrid';
import { useTemplates } from '@/hooks/useTemplates';
import type { TemplateView } from '@/types';

/**
 * The "valmiit setit" band above the catalogue: pre-picked sets shown as cards
 * the same size and shape as the item cards, then a rule separating them from
 * the items themselves.
 *
 * Renders nothing when there are no usable sets — an empty heading and divider
 * would just eat the top of the grid. A set whose items have all been archived
 * is dropped rather than opening onto an empty modal.
 */
export default function TemplateSection() {
  const { templates } = useTemplates();
  const [active, setActive] = useState<TemplateView | null>(null);

  const usable = templates.filter((template) => template.items.length > 0);
  if (usable.length === 0) return null;

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

      <div className={ITEM_GRID_CLASSES}>
        {usable.map((template) => (
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
