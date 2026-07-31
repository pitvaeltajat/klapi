import { NextResponse } from 'next/server';
import { AnnouncementKind } from '@prisma/client';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

/**
 * Publish a huomio on one or more kamat. Triage publishes the same text onto
 * every kama a report concerns, linked back via `reportId`; the item page
 * publishes onto a single kama with no report behind it.
 */
export async function POST(request: Request) {
  try {
    const { denied } = await requireAdmin();
    if (denied) return denied;

    const { itemIds, message, kind, reportId } = (await request.json()) as {
      itemIds?: unknown;
      message?: unknown;
      kind?: unknown;
      reportId?: unknown;
    };

    const ids = Array.isArray(itemIds)
      ? itemIds.filter((id): id is string => typeof id === 'string')
      : [];
    const trimmed = typeof message === 'string' ? message.trim() : '';

    if (ids.length === 0 || trimmed === '') {
      return NextResponse.json({ message: 'Valitse kama ja kirjoita huomio' }, { status: 400 });
    }

    const announcementKind =
      kind === AnnouncementKind.KORJATTAVAA
        ? AnnouncementKind.KORJATTAVAA
        : AnnouncementKind.TIEDOKSI;

    await prisma.announcement.createMany({
      data: ids.map((itemId) => ({
        itemId,
        message: trimmed,
        kind: announcementKind,
        reportId: typeof reportId === 'string' && reportId !== '' ? reportId : null,
      })),
    });

    return NextResponse.json({ count: ids.length });
  } catch (error) {
    console.error('Virhe julkaistaessa huomiota:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
