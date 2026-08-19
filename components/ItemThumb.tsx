'use client';

import { useItemImageState } from '@/hooks/useItemImage';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ItemThumbProps {
  itemId: string;
  /** Pass `''` when the kaman nimi is already the text right next to it. */
  alt: string;
  /** Box size, rounding and border. The image fills it exactly. */
  className?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * The small square photo beside a kaman nimi in a list or a table row.
 *
 * The three call sites used to hold their own copy of this and all three read
 * the URL through `useItemImage`, which answers with the "Ei kuvaa" placeholder
 * while the probe is still running — so every row showed the placeholder for a
 * beat and then swapped in the real photo. Probing through `useItemImageState`
 * instead lets the box pulse until the answer is known, and the placeholder is
 * shown only when the kama genuinely has no picture.
 *
 * The box owns the size and the image fills it, so the skeleton, the photo and
 * the placeholder all occupy exactly the same space. For the big detail-page
 * photo see ItemView; for the catalogue cards see ItemCardShell, which carries
 * the same idea at card size.
 */
export default function ItemThumb({ itemId, alt, className, loading = 'lazy' }: ItemThumbProps) {
  const { src, status, placeholder } = useItemImageState(itemId);

  return (
    <div className={cn('shrink-0 overflow-hidden bg-muted', className)}>
      {status === 'loading' ? (
        <Skeleton className="h-full w-full rounded-none" />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element -- dynamic S3 URL with onError fallback */
        <img
          src={src}
          alt={alt}
          aria-hidden={alt === '' || undefined}
          loading={loading}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholder;
          }}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
