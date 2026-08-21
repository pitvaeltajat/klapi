import { NextResponse } from 'next/server';
import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import { requireAdmin } from '@/utils/apiAuth';
import { isUploadableCustomItemId } from '@/utils/customItems';
import { logItemHistory } from '@/utils/itemHistory';
import prisma from '@/utils/prisma';

/**
 * Throws away a kama's photo without putting another one in its place — the
 * dialogs could only ever *replace* a picture, so a photo of the wrong kama (or
 * of somebody's living room) had to stay up until a better one was taken.
 *
 * Admin-only: adding a *missing* photo is open to any loaner (see
 * `uploadImage`), but removing one that exists is not.
 *
 * All three keys go: the raw upload at the bucket root and the `original/` /
 * `compressed/` renditions the Lambda derives from it. Leaving a rendition
 * behind would keep the old picture on the cards — the browser probes those
 * keys, not the root one.
 */
export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const { itemId } = await request.json();

  // The id is used verbatim as an S3 key prefix, so it has to be a kama we
  // know: an existing row, or the unguessable `custom-<uuid>` of an oma kama
  // whose row submitLoan hasn't created yet.
  const item =
    typeof itemId === 'string'
      ? await prisma.item.findUnique({ where: { id: itemId }, select: { id: true, name: true } })
      : null;
  if (!item && !isUploadableCustomItemId(itemId)) {
    return NextResponse.json({ message: 'Kamaa ei löytynyt' }, { status: 404 });
  }

  const key = item?.id ?? (itemId as string);

  try {
    const client = new S3Client({
      region: process.env.KLAPI_AWS_REGION ?? '',
      credentials: {
        accessKeyId: process.env.KLAPI_AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.KLAPI_AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
    // S3 deletes are idempotent: a key that was never there answers 204 like
    // the rest, so a kama with only some of the three renditions is fine.
    await client.send(
      new DeleteObjectsCommand({
        Bucket: process.env.AWS_BUCKET_NAME ?? '',
        Delete: {
          Objects: [{ Key: key }, { Key: `original/${key}` }, { Key: `compressed/${key}` }],
          Quiet: true,
        },
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Kuvan poisto epäonnistui' },
      { status: 500 },
    );
  }

  if (item) {
    await logItemHistory({
      itemId: item.id,
      action: 'UPDATED',
      actedById: session.user.id,
      details: { note: 'Kuva poistettu' },
    });
  }

  return NextResponse.json({ message: 'Kuva poistettu' });
}
