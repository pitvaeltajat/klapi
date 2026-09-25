import { getCompressedImageUrl, getOriginalImageUrl, getRootImageUrl } from '@/utils/imageHelpers';
import prisma from '@/utils/prisma';

/**
 * Does this kama have a picture? Asked of the bucket over plain HTTP — the
 * photos are public, so this needs no extra IAM rights, and it covers all three
 * keys the browser probes: the Lambda's `original/` and `compressed/`
 * renditions plus the raw upload at the root.
 */
export async function photoExists(itemId: string): Promise<boolean> {
  const urls = [
    getOriginalImageUrl(itemId),
    getCompressedImageUrl(itemId),
    getRootImageUrl(itemId),
  ].filter((url): url is string => Boolean(url));

  const found = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        return response.ok;
      } catch {
        return false;
      }
    }),
  );
  return found.some(Boolean);
}

/**
 * Re-checks `Item.hasImage` against the bucket for every kama and writes the
 * rows that changed. The first run is the backfill; after that it catches
 * uploads (which reset the flag to null) and anything that drifted, such as an
 * upload racing a previous run — so a wrong flag lasts a day at most.
 */
export async function resolveItemImages(): Promise<{ withImage: number; without: number }> {
  const items = await prisma.item.findMany({
    where: { deletedAt: null },
    select: { id: true, hasImage: true },
  });

  const toTrue: string[] = [];
  const toFalse: string[] = [];
  let withImage = 0;
  // Batches keep the bucket from seeing a few thousand HEADs at once.
  for (let i = 0; i < items.length; i += 20) {
    const batch = items.slice(i, i + 20);
    const results = await Promise.all(batch.map((item) => photoExists(item.id)));
    batch.forEach((item, j) => {
      if (results[j]) withImage++;
      if (item.hasImage !== results[j]) (results[j] ? toTrue : toFalse).push(item.id);
    });
  }

  await prisma.$transaction([
    prisma.item.updateMany({ where: { id: { in: toTrue } }, data: { hasImage: true } }),
    prisma.item.updateMany({ where: { id: { in: toFalse } }, data: { hasImage: false } }),
  ]);
  return { withImage, without: items.length - withImage };
}
