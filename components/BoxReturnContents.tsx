'use client';

import React from 'react';
import { Minus, Package, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OutstandingBoxContent } from '@/utils/boxContents';

/** How a borrower is handing one content back this time; the rest stays on loan. */
export interface ContentDisposition {
  returned: number;
  missing: number;
}

/** Keep `returned + missing` within what is still owed; floor at 0. */
export function clampDisposition(d: ContentDisposition, remaining: number): ContentDisposition {
  const returned = Math.max(0, Math.min(Math.floor(d.returned), remaining));
  const missing = Math.max(0, Math.min(Math.floor(d.missing), remaining - returned));
  return { returned, missing };
}

function Stepper({
  label,
  value,
  max,
  onChange,
  valueClassName,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <div className="flex h-9 items-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Vähennä ${label}`}
          onClick={() => onChange(value - 1)}
          disabled={value <= 0}
          className="h-full w-9 shrink-0 rounded-r-none"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span
          className={cn(
            'flex h-full min-w-10 items-center justify-center border-y border-input bg-background px-2 text-sm font-bold',
            valueClassName,
          )}
          aria-live="polite"
        >
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Lisää ${label}`}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          className="h-full w-9 shrink-0 rounded-l-none"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * The per-content return control for a box on the palautus screen. Each content
 * a borrower still owes on the box gets its own labelled row — readable, one kama
 * per line under a "Sisältö" heading, not the cramped tick-list it replaced. Per
 * row the borrower sets how many units they are handing back now ("Palautan") and
 * how many are missing ("Puuttuu"); whatever is left of the remaining amount
 * stays out on the loan and is asked about again next time.
 *
 * Fully controlled: the parent owns the dispositions (keyed per reservation) and
 * the outstanding list (already filtered to what is still owed, with contents out
 * on another loan shown greyed — those are never this borrower's to bring back).
 */
export default function BoxReturnContents({
  contents,
  dispositions,
  onChange,
}: {
  contents: OutstandingBoxContent[];
  /** By content id; a missing entry means "return all, nothing missing" (the default). */
  dispositions: Record<string, ContentDisposition>;
  onChange: (itemId: string, next: ContentDisposition) => void;
}) {
  const actionable = contents.filter((c) => !c.outOnLoan);
  const elsewhere = contents.filter((c) => c.outOnLoan);

  if (actionable.length === 0 && elsewhere.length === 0) return null;

  return (
    <Card variant="inset" padding="sm" className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Package className="h-4 w-4 shrink-0" aria-hidden />
        <span>Sisältö · {actionable.length} kamaa</span>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {actionable.map((content) => {
          const d = dispositions[content.id] ?? { returned: content.remaining, missing: 0 };
          const later = content.remaining - d.returned - d.missing;
          return (
            <li key={content.id} className="flex flex-col gap-2 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 break-words font-medium">{content.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {content.remaining} kpl
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Stepper
                  label="Palautan"
                  value={d.returned}
                  max={content.remaining}
                  onChange={(v) =>
                    onChange(
                      content.id,
                      clampDisposition({ returned: v, missing: d.missing }, content.remaining),
                    )
                  }
                />
                <Stepper
                  label="Puuttuu"
                  value={d.missing}
                  max={content.remaining - d.returned}
                  valueClassName={d.missing > 0 ? 'text-destructive' : undefined}
                  onChange={(v) =>
                    onChange(
                      content.id,
                      clampDisposition({ returned: d.returned, missing: v }, content.remaining),
                    )
                  }
                />
                {later > 0 && (
                  <span className="text-sm text-muted-foreground">· {later} jää lainaan</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {elsewhere.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1 border-t pt-2 text-sm">
          {elsewhere.map((content) => (
            <li key={content.id} className="flex justify-between gap-2 opacity-60">
              <span className="min-w-0 break-words">{content.name}</span>
              <span className="shrink-0 text-muted-foreground">lainassa muualla</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
