export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { auth } from '@/lib/auth';
import NoticesView from './NoticesView';

export const metadata = { title: 'Huomiot | Klapi' };

/**
 * The one page for huomiot. Loaners see what has been published about the
 * kalusto; admins see the same list plus the queue of loaner-written huomiot
 * waiting to be triaged. Replaces the old split between `/item/announcements`
 * and `/admin/reports`, which described the two halves of one workflow as if
 * they were unrelated features.
 */
export default async function NoticesPage() {
  const session = await auth();
  const isAdmin = session?.user?.group === 'ADMIN';

  const [rawAnnouncements, reports] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: { item: true },
    }),
    // Loaner-written huomiot carry free text that may name people, so they stay
    // out of the non-admin payload entirely.
    isAdmin
      ? prisma.report.findMany({
          where: { status: { not: 'RESOLVED' } },
          orderBy: { createdAt: 'desc' },
          include: {
            loan: {
              include: {
                reservations: { include: { item: true } },
                user: { select: { name: true } },
              },
            },
            affectedItems: { include: { item: true } },
            announcements: { select: { id: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  // An announcement whose kama was hard-deleted has nothing to point at.
  const announcements = rawAnnouncements.filter(
    (a): a is typeof a & { item: NonNullable<typeof a.item> } => a.item !== null,
  );

  return (
    <NoticesView
      announcements={serialize(announcements)}
      reports={serialize(reports)}
      isAdmin={isAdmin}
    />
  );
}
