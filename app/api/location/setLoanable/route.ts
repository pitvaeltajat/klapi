import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';
import { logItemHistory } from '@/utils/itemHistory';
import { setLocationLoanable } from '@/utils/containers';

/**
 * Switch a sijainti's "lainattava" on or off (`{ id, loanable }`). See
 * `utils/containers.ts` for the kama that stands behind a lainattava sijainti.
 */
export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const { id, loanable } = await request.json();
  const before =
    typeof id === 'string' && id
      ? await prisma.location.findUnique({ where: { id }, select: { name: true, itemId: true } })
      : null;
  if (!before || typeof loanable !== 'boolean') {
    return NextResponse.json({ message: 'Sijaintia ei löytynyt' }, { status: 404 });
  }

  await setLocationLoanable(id, loanable);

  const after = await prisma.location.findUnique({ where: { id }, select: { itemId: true } });
  if (loanable && !before.itemId && after?.itemId) {
    await logItemHistory({
      itemId: after.itemId,
      action: 'CREATED',
      actedById: session.user.id,
      details: { name: before.name, amount: 1, note: 'Lainattava sijainti' },
    });
  }
  if (!loanable && before.itemId) {
    await logItemHistory({
      itemId: before.itemId,
      action: 'ARCHIVED',
      actedById: session.user.id,
      details: { name: before.name, note: 'Sijainti ei enää lainattava' },
    });
  }

  return NextResponse.json({ itemId: after?.itemId ?? null });
}
