import { NextResponse } from 'next/server';
import { resolveItemImages } from '@/utils/itemPhotos';
import prisma from '@/utils/prisma';

// Records which kamat have a photo (Item.hasImage), so the catalogue cards and
// the Kamat table can skip probing S3 for the ones that don't. Runs nightly
// (see vercel.json); the first run backfills every existing kama.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const counts = await resolveItemImages();
    console.log(`Item photos: ${counts.withImage} with, ${counts.without} without`);
    return NextResponse.json({ message: 'Item photo check completed', ...counts });
  } catch (error) {
    console.error('Error resolving item photos:', error);
    return NextResponse.json({ message: 'Failed to resolve item photos' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
