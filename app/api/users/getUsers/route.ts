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

    // Ordered the way the picker reads the rows — by name, falling back to the
    // address for an account that has none. Finnish sorts `ä å ö` after `z`,
    // which neither Prisma's `orderBy` (it inherits the database's collation,
    // usually en_US) nor `localeCompare` gets right, so the ICU collation is
    // named explicitly. That is raw SQL because `orderBy` has no COLLATE.
    const users = await prisma.$queryRaw<{ id: string; email: string | null; name: string | null }[]>`
      SELECT id, email, name
      FROM "User"
      WHERE "deletedAt" IS NULL AND "group" <> 'KIOSK'
      ORDER BY COALESCE(NULLIF(name, ''), email, '') COLLATE "fi-FI-x-icu" ASC
    `;

    return NextResponse.json(users);
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
