import { NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { requireUser } from '@/utils/apiAuth';
import { isUploadableCustomItemId } from '@/utils/customItems';
import {
  getCompressedImageUrl,
  getOriginalImageUrl,
  getRootImageUrl,
} from '@/utils/imageHelpers';
import prisma from '@/utils/prisma';

/**
 * Does this kama already have a picture? Asked of the bucket over plain HTTP —
 * the photos are public, so this needs no extra IAM rights, and it covers all
 * three keys the browser probes: the Lambda's `original/` and `compressed/`
 * renditions plus the raw upload at the root.
 */
async function hasPhoto(itemId: string): Promise<boolean> {
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
        // The bucket is unreachable — the upload itself would fail next anyway.
        return false;
      }
    }),
  );
  return found.some(Boolean);
}

export async function POST(request: Request) {
  const { filename, contentType } = await request.json();

  // Two callers are trusted with a presigned upload besides an admin:
  //
  //  - a loaner's own "oma kama", keyed by an unguessable `custom-<uuid>` that
  //    no catalogue item can ever have, so it can't overwrite anything;
  //  - anyone adding the *missing* photo of a real kama — half the catalogue has
  //    none and the person holding the thing is the one who can photograph it.
  //    Replacing a picture that already exists stays with admins.
  //
  // The shared kiosk terminal is left out of both — there's nobody's phone to
  // pick a picture from.
  const isCustomUpload = isUploadableCustomItemId(filename);
  const { session, denied } = await requireUser();
  if (denied) return denied;

  const isAdmin = session.user.group === 'ADMIN';

  if (!isAdmin) {
    if (session.user.group === 'KIOSK') {
      return NextResponse.json({ message: 'Sinulla ei ole oikeutta tähän toimintoon' }, { status: 401 });
    }
    // Admins upload through the item dialogs, which are picture-only anyway;
    // for these paths the type is caller-supplied, so it's checked.
    if (typeof contentType !== 'string' || !contentType.startsWith('image/')) {
      return NextResponse.json({ message: 'Vain kuvatiedostot kelpaavat' }, { status: 400 });
    }

    if (!isCustomUpload) {
      // The key goes into S3 verbatim, so it has to be a kama that exists —
      // otherwise a caller could presign `compressed/<id>` and poison the
      // rendition of someone else's photo.
      const item =
        typeof filename === 'string'
          ? await prisma.item.findUnique({ where: { id: filename }, select: { id: true } })
          : null;
      if (!item) {
        return NextResponse.json({ message: 'Kamaa ei löytynyt' }, { status: 404 });
      }
      if (await hasPhoto(item.id)) {
        return NextResponse.json(
          { message: 'Kamalla on jo kuva — vain ylläpitäjä voi vaihtaa sen' },
          { status: 403 },
        );
      }
    }
  }

  try {
    const client = new S3Client({
      region: process.env.KLAPI_AWS_REGION ?? '',
      credentials: {
        accessKeyId: process.env.KLAPI_AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.KLAPI_AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
    const { url, fields } = await createPresignedPost(client, {
      Bucket: process.env.AWS_BUCKET_NAME ?? '',
      Key: filename,
      Conditions: [
        ['content-length-range', 0, 10485760], // up to 10 MB
        ['starts-with', '$Content-Type', contentType],
      ],
      Fields: {
        'Content-Type': contentType,
      },
      Expires: 600,
    });

    return NextResponse.json({ url, fields });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
