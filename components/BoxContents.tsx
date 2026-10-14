'use client';

import React from 'react';
import { Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface BoxContent {
  id: string;
  name: string;
  amount: number;
  /** Out on a loan of its own, so it was never in the box — see utils/boxContents. */
  outOnLoan?: boolean;
  /** Units reported missing when the box was returned — not in the box. */
  missingAmount?: number;
  /** Units handed back when the box was returned. */
  returnedAmount?: number;
}

const fiCollator = new Intl.Collator('fi');

/**
 * What is inside a kama that stands behind a lainattava sijainti, folded away
 * until asked for — a read-only list.
 *
 * It earns its place at the moments the loan is physically in someone's hands:
 * handing "Sininen työkalupakki" over at the counter, and reading back what a
 * returned box is recorded to hold. The question is the same — what belongs in
 * this box, and what is actually in it — and the answer is otherwise a trip to
 * the box's own page. Where the contents are *acted on* (the borrower's return,
 * the admin's shelving check) the stepper cards in `BoxReturnContents` take over.
 *
 * A native `<details>`, so it needs no state, no library and no JavaScript to
 * open.
 */
export default function BoxContents({
  contents,
  defaultOpen = false,
  className,
}: {
  contents: BoxContent[];
  /**
   * Start unfolded. The screens where the box is physically in someone's hands
   * pass this: at the counter the list is the job, and one more tap before you
   * can start counting is one too many. Elsewhere it stays folded — the loan
   * page is for reading, and several boxes' worth of contents would bury the
   * loan itself.
   *
   * Only the initial state: `<details>` owns it after that, so opening or
   * closing one sticks while the rest of the screen re-renders.
   */
  defaultOpen?: boolean;
  className?: string;
}) {
  if (contents.length === 0) return null;

  const sorted = [...contents].sort((a, b) => fiCollator.compare(a.name, b.name));
  const elsewhereCount = sorted.filter((content) => content.outOnLoan).length;
  // Contents the borrower reported missing when the box came back — they are not
  // in the box, however full "Sisältää N kamaa" makes it sound.
  const reportedMissingCount = sorted.filter(
    (content) => !content.outOnLoan && (content.missingAmount ?? 0) > 0,
  ).length;

  return (
    <Card as="details" variant="inset" padding="sm" open={defaultOpen} className={className}>
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
        {reportedMissingCount > 0 && (
          <span className="whitespace-nowrap font-semibold text-destructive">
            · {reportedMissingCount} puuttuu
          </span>
        )}
      </summary>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {sorted.map((content) => {
          // Reported missing on the return: how many of this content never came
          // back, and how many did (the rest of its amount).
          const reportedMissing = content.outOnLoan ? 0 : content.missingAmount ?? 0;
          const inBox = content.amount - reportedMissing;
          const fullyMissing = reportedMissing > 0 && inBox <= 0;
          return (
            <li
              key={content.id}
              className={cn('flex justify-between gap-2', content.outOnLoan && 'opacity-60')}
            >
              <span className={cn('min-w-0 break-words', fullyMissing && 'line-through')}>
                {content.name}
              </span>
              <span className="shrink-0 text-right text-muted-foreground">
                {content.outOnLoan ? (
                  'lainassa muualla'
                ) : reportedMissing > 0 ? (
                  <>
                    {inBox > 0 && `${inBox} kpl · `}
                    <span className="font-semibold text-destructive">
                      {reportedMissing} puuttuu
                    </span>
                  </>
                ) : (
                  `${content.amount} kpl`
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
