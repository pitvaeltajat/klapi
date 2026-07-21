import { NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { requireAdmin } from '@/utils/apiAuth';

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { filename, contentType } = await request.json();

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
