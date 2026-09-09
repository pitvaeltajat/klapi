'use client';

import React from 'react';
import { Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CheckboxIndicator } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface BoxContent {
  id: string;
  name: string;
  amount: number;
  /** Out on a loan of its own, so it was never in the box — see utils/boxContents. */
  outOnLoan?: boolean;
}

export interface BoxChecklist {
  /** Contents that were *not* found — everything starts present. */
  missing: Set<string>;
  onToggle: (contentId: string) => void;
}

const fiCollator = new Intl.Collator('fi');

/**
 * What is inside a kama that is a säilytyspaikka, folded away until asked for.
 *
 * It earns its place at the two moments the loan is physically in someone's
 * hands: handing "Sininen työkalupakki" over, and checking it back in. The
 * question both times is the same — is everything that belongs in this box
 * actually in it — and the answer is otherwise a trip to the box's own page.
 *
 * With a `checklist` it becomes tickable, which is what the return screen wants:
 * the contents are not reservations of their own, so unticking one records
 * nothing by itself — the caller turns what is left unticked into the huomio
 * the return already collects.
 *
 * A native `<details>`, so it needs no state, no library and no JavaScript to
 * open. Inside a tickable row every click is a click on that row's `<label>`,
 * so the summary stops propagation and each content is a `<button>` — clicking
 * interactive content doesn't activate a label, which a nested `<input>` under
 * one wouldn't manage.
 */
export default function BoxContents({
  contents,
  checklist,
  className,
}: {
  contents: BoxContent[];
  checklist?: BoxChecklist;
  className?: string;
}) {
  if (contents.length === 0) return null;

  const sorted = [...contents].sort((a, b) => fiCollator.compare(a.name, b.name));
  const missingCount = checklist
    ? sorted.filter((content) => !content.outOnLoan && checklist.missing.has(content.id)).length
    : 0;
  const elsewhereCount = sorted.filter((content) => content.outOnLoan).length;

  return (
    <Card as="details" variant="inset" padding="sm" className={className}>
      <summary
        onClick={(e) => e.stopPropagation()}
        // The counts wrap as whole phrases: this sits in a narrow column on the
        // return screen, and "Sisältää 4 / kamaa" split over two lines reads as
        // a rendering bug.
        className="flex cursor-pointer list-none flex-wrap items-center gap-x-1.5 text-sm font-medium text-muted-foreground marker:content-none"
      >
        <Package className="h-4 w-4 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">Sisältää {sorted.length} kamaa</span>
        {elsewhereCount > 0 && (
          <span className="whitespace-nowrap">· {elsewhereCount} lainassa muualla</span>
        )}
        {missingCount > 0 && (
          <span className="whitespace-nowrap font-semibold text-destructive">
            · {missingCount} puuttuu
          </span>
        )}
      </summary>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {sorted.map((content) => {
          const isMissing = !content.outOnLoan && (checklist?.missing.has(content.id) ?? false);
          const row = (
            <>
              <span className={cn('min-w-0 break-words', isMissing && 'line-through')}>
                {content.name}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {content.outOnLoan ? 'lainassa muualla' : `${content.amount} kpl`}
              </span>
            </>
          );

          // Somebody else has it, so it never went out in the box. It stays on
          // the list — the kiosk should know not to look for it — but it is not
          // the palauttaja's to bring back, so it can't be ticked or missed.
          if (!checklist || content.outOnLoan) {
            return (
              <li
                key={content.id}
                className={cn('flex justify-between gap-2', content.outOnLoan && 'opacity-60')}
              >
                {row}
              </li>
            );
          }

          return (
            <li key={content.id}>
              <button
                type="button"
                aria-pressed={!isMissing}
                onClick={(e) => {
                  e.stopPropagation();
                  checklist.onToggle(content.id);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-1 py-1 text-left transition-colors hover:bg-muted',
                  isMissing && 'text-destructive',
                )}
              >
                <CheckboxIndicator checked={!isMissing} />
                <span className="flex min-w-0 flex-1 justify-between gap-2">{row}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
