'use client';

import React from 'react';
import { Package } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface BoxContent {
  id: string;
  name: string;
  amount: number;
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
 * A native `<details>`, so it needs no state, no library and no JavaScript to
 * open. Inside a tickable row the summary is also a click target, hence the
 * `stopPropagation`: opening the list must not tick the row.
 */
export default function BoxContents({
  contents,
  className,
}: {
  contents: BoxContent[];
  className?: string;
}) {
  if (contents.length === 0) return null;

  const sorted = [...contents].sort((a, b) => fiCollator.compare(a.name, b.name));

  return (
    <Card as="details" variant="inset" padding="sm" className={className}>
      <summary
        onClick={(e) => e.stopPropagation()}
        className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground marker:content-none"
      >
        <Package className="h-4 w-4 shrink-0" aria-hidden />
        Sisältää {sorted.length} kamaa
      </summary>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {sorted.map((content) => (
          <li key={content.id} className="flex justify-between gap-2">
            <span className="min-w-0 break-words">{content.name}</span>
            <span className="shrink-0 text-muted-foreground">{content.amount} kpl</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
