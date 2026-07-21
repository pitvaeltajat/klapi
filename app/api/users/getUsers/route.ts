import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdminOrKiosk } from '@/utils/apiAuth';

export async function GET() {
  try {
    // Loaner lookup is an admin/kiosk-only affordance (see LoanerAutocomplete,
    // rendered only for ADMIN/KIOSK). Gate it: leaving it open lets anyone
    // enumerate every user's id/email/name — the reconnaissance step for
    // impersonating an admin at the kiosk.
    const { denied } = await requireAdminOrKiosk();
    if (denied) return denied;

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        group: {
          not: 'KIOSK',
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
