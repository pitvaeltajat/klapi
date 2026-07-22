'use client';

import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTemplates } from '@/hooks/useTemplates';
import TemplateDialog from './TemplateDialog';
import type { TemplateView } from '@/types';

/**
 * The "Valmiit setit" chip row above the item list. Renders nothing at all when
 * there are no usable templates — an empty label with no chips under it would
 * just eat a line of the sticky header on the kiosk's short screen.
 *
 * A template whose items have all been archived is dropped here rather than
 * opening onto an empty modal.
 */
export default function TemplatePicker() {
  const { templates } = useTemplates();
  const [active, setActive] = useState<TemplateView | null>(null);

  const usable = templates.filter((template) => template.items.length > 0);
  if (usable.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Layers className="size-4 shrink-0" aria-hidden />
          Valmiit setit:
        </span>
        {usable.map((template) => (
          <Button
            key={template.id}
            size="xs"
            variant="outline-solid"
            onClick={() => setActive(template)}
            title={template.description ?? undefined}
          >
            {template.name}
          </Button>
        ))}
      </div>
      {active && (
        // Keyed so switching templates remounts with freshly seeded amounts
        // instead of carrying the previous set's numbers over.
        <TemplateDialog key={active.id} template={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}
