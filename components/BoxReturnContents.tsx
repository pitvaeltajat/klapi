'use client';

import React from 'react';
import { Minus, Package, Plus } from 'lucide-react';
import ItemCardShell from '@/components/ItemCardShell';
import { Button } from '@/components/ui/button';
import { useItemImageState } from '@/hooks/useItemImage';
import { cn } from '@/lib/utils';
import type { OutstandingBoxContent } from '@/utils/boxContents';

/** How a borrower is handing one content back this time; the rest stays on loan. */
export interface ContentDisposition {
  returned: number;
  missing: number;
}

/**
 * `return` — the borrower hands contents back (how many returned, how many
 * missing; the rest stays on loan). `verify` — the admin opens the box at
 * shelving and confirms what the borrower returned is really there, flagging any
 * that are not. Same card either way; only the steppers and wording differ.
 */
export type BoxReturnMode = 'return' | 'verify';

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
  suffix,
  valueClassName,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
  suffix?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <div className="flex h-8 items-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Vähennä ${label}`}
            onClick={() => onChange(value - 1)}
            disabled={value <= 0}
            className="h-full w-8 shrink-0 rounded-r-none"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span
            className={cn(
              'flex h-full min-w-8 items-center justify-center border-y border-input bg-background px-1 text-sm font-bold',
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
            className="h-full w-8 shrink-0 rounded-l-none"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {suffix && <span className="w-10 shrink-0 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

/**
 * One box content as the app's normal item card (`ItemCardShell`), with its
 * photo and name, and the per-unit "Palautan"/"Puuttuu" steppers in the action
 * slot. A single content line can hold several units, so both are per-unit; what
 * is neither returned nor missing stays out on the loan and is asked about again.
 */
function BoxContentCard({
  content,
  disposition,
  onChange,
  mode = 'return',
}: {
  content: OutstandingBoxContent;
  disposition: ContentDisposition;
  onChange: (next: ContentDisposition) => void;
  mode?: BoxReturnMode;
}) {
  const image = useItemImageState(content.id);
  const verify = mode === 'verify';
  const later = content.remaining - disposition.returned - disposition.missing;

  return (
    <ItemCardShell
      compact
      name={content.name}
      imageSrc={image.src}
      placeholder={image.placeholder}
      loading={image.status === 'loading'}
      subtitle={
        <span className="font-normal text-muted-foreground">
          {verify
            ? `${content.remaining} kpl laatikossa`
            : `${content.remaining} kpl${later > 0 ? ` · ${later} jää lainaan` : ''}`}
        </span>
      }
      action={
        // Verifying from the box: the units are already recorded back, so the
        // only question is how many are *not* really there. One "Puuttuu"
        // stepper; the rest stay counted as present.
        verify ? (
          <Stepper
            label="Puuttuu"
            value={disposition.missing}
            max={content.remaining}
            suffix={`/ ${content.remaining}`}
            valueClassName={disposition.missing > 0 ? 'text-destructive' : undefined}
            onChange={(v) => {
              const missing = Math.max(0, Math.min(Math.floor(v), content.remaining));
              onChange({ returned: content.remaining - missing, missing });
            }}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <Stepper
              label="Palautan"
              value={disposition.returned}
              max={content.remaining}
              suffix={`/ ${content.remaining}`}
              onChange={(v) =>
                onChange(clampDisposition({ returned: v, missing: disposition.missing }, content.remaining))
              }
            />
            <Stepper
              label="Puuttuu"
              value={disposition.missing}
              max={content.remaining - disposition.returned}
              valueClassName={disposition.missing > 0 ? 'text-destructive' : undefined}
              onChange={(v) =>
                onChange(clampDisposition({ returned: disposition.returned, missing: v }, content.remaining))
              }
            />
          </div>
        )
      }
    />
  );
}

/**
 * The per-content return control for a box on the palautus screen. Each content
 * the borrower still owes on the box becomes its own item card — photo, name and
 * the return steppers — under a "Sisältö" heading, so a 24-kama box reads like
 * the rest of the kamalista rather than a cramped tick-list. Contents out on
 * another loan were never this borrower's to bring back, so they are listed
 * greyed and non-actionable.
 *
 * Fully controlled: the parent owns the dispositions (keyed per reservation) and
 * the outstanding list (already filtered to what is still owed).
 */
export default function BoxReturnContents({
  contents,
  dispositions,
  onChange,
  mode = 'return',
}: {
  contents: OutstandingBoxContent[];
  /** By content id; a missing entry means "return all, nothing missing" (the default). */
  dispositions: Record<string, ContentDisposition>;
  onChange: (itemId: string, next: ContentDisposition) => void;
  mode?: BoxReturnMode;
}) {
  // A content gets a stepper card only when there is a pool to act on: units
  // owed (return) or recorded back in the box (verify). The rest still show —
  // out on another loan, or already reported missing — so the whole box is
  // visible and the admin knows what belongs in it, just without a control.
  const actionable = contents.filter((c) => !c.outOnLoan && c.remaining > 0);
  const info = contents.filter((c) => c.outOnLoan || c.remaining <= 0);

  if (contents.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Package className="h-4 w-4 shrink-0" aria-hidden />
        <span>Sisältö · {contents.length} kamaa</span>
      </div>

      {actionable.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actionable.map((content) => (
            <BoxContentCard
              key={content.id}
              content={content}
              mode={mode}
              disposition={dispositions[content.id] ?? { returned: content.remaining, missing: 0 }}
              onChange={(next) => onChange(content.id, next)}
            />
          ))}
        </div>
      )}

      {info.length > 0 && (
        <ul className="flex flex-col gap-1 border-t pt-2 text-sm">
          {info.map((content) => (
            <li key={content.id} className="flex justify-between gap-2 opacity-60">
              <span
                className={cn('min-w-0 break-words', !content.outOnLoan && 'line-through')}
              >
                {content.name}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {content.outOnLoan
                  ? 'lainassa muualla'
                  : `${content.missingAmount} puuttuu`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
