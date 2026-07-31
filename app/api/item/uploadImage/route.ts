import { NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { requireAdmin, requireUser } from '@/utils/apiAuth';
import { isUploadableCustomItemId } from '@/utils/customItems';

export async function POST(request: Request) {
  const { filename, contentType } = await request.json();

  // Catalogue photos stay admin-only. The exception is a loaner's own "oma
  // kama": its key is an unguessable `custom-<uuid>` that no catalogue item can
  // ever have, so signing an upload for it can't overwrite anything. The shared
  // kiosk terminal is left out — there's nobody's phone to pick a picture from.
  const isCustomUpload = isUploadableCustomItemId(filename);
  const { session, denied } = isCustomUpload ? await requireUser() : await requireAdmin();
  if (denied) return denied;

  if (isCustomUpload) {
    if (session.user.group === 'KIOSK') {
      return NextResponse.json({ message: 'Sinulla ei ole oikeutta tähän toimintoon' }, { status: 401 });
    }
    // Admins upload through the item dialogs, which are picture-only anyway;
    // for this path the type is caller-supplied, so it's checked.
    if (typeof contentType !== 'string' || !contentType.startsWith('image/')) {
      return NextResponse.json({ message: 'Vain kuvatiedostot kelpaavat' }, { status: 400 });
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
