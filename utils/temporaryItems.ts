import prisma from '@/utils/prisma';
import { isUploadableCustomItemId } from '@/utils/customItems';

/**
 * Server side of "omat kamat" — the one-off gear a loaner types into a loan
 * instead of picking it from the catalogue. The browser mints the id (see
 * `utils/customItems.ts`) and may upload a photo to S3 under it; the `Item` row
 * itself is only created when the loan is saved, which is what this module
 * does. Both `loan/submitLoan` (a new loan) and `loan/updateLoan` (a kama added
 * while editing one) go through it, so the two agree on the rules.
 */

export interface TemporaryItemRequest {
  /** The client-generated id, `custom-<uuid>` for anything this release made. */
  itemId: string;
  name?: string;
  amount?: number;
}

/**
 * Creates one `type: temporary` Item per request and answers with
 * `requested id -> created id`.
 *
 * The requested id is kept where it can be: the photo already sits in S3 under
 * that key and the image URLs are derived from the item id, so reusing it is
 * what makes the picture line up. An id of the wrong shape (an older client) or
 * one already taken — a soft-deleted temporary item still holds its row — falls
 * back to a database-generated id. The loan matters more than the picture.
 *
 * Temporary items are deliberately **not** history-logged: they are part of the
 * loan, and the loan's own history already records them.
 */
export async function createTemporaryItems(
  requests: TemporaryItemRequest[],
): Promise<Map<string, string>> {
  if (requests.length === 0) return new Map();

  const takenIds = new Set(
    (
      await prisma.item.findMany({
        where: { id: { in: requests.map((r) => r.itemId) } },
        select: { id: true },
      })
    ).map((i) => i.id),
  );

  const created = await Promise.all(
    requests.map((r) =>
      prisma.item.create({
        data: {
          ...(isUploadableCustomItemId(r.itemId) && !takenIds.has(r.itemId)
            ? { id: r.itemId }
            : {}),
          name: r.name!,
          description: 'Automaattisesti luotu väliaikainen item',
          amount: r.amount ?? 1,
          type: 'temporary',
        },
        select: { id: true },
      }),
    ),
  );

  return new Map(requests.map((r, i) => [r.itemId, created[i].id]));
}
