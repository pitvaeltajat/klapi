export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import AnnouncementsView from './AnnouncementsView';

export const metadata = { title: 'Ilmoitukset | Klapi' };

export default async function AnnouncementsPage() {
  const rawAnnouncements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    include: { item: true },
  });

  const announcements = rawAnnouncements.filter(
    (a): a is typeof a & { item: NonNullable<typeof a.item> } => a.item !== null,
  );

  return <AnnouncementsView announcements={serialize(announcements)} />;
}
