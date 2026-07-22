import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';
import {
  templateItemsInclude,
  toTemplateView,
  normalizeTemplateItems,
  allItemsLoanable,
} from '@/utils/templateQueries';

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const id = typeof body.id === 'string' ? body.id : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : null;

  if (!id) {
    return NextResponse.json({ message: 'Pohjaa ei löytynyt' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ message: 'Anna pohjalle nimi' }, { status: 400 });
  }

  const items = normalizeTemplateItems(body.items);
  if (items === null) {
    return NextResponse.json({ message: 'Virheellinen kamalista' }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json(
      { message: 'Pohjassa pitää olla vähintään yksi kama' },
      { status: 400 },
    );
  }
  if (!(await allItemsLoanable(items.map((entry) => entry.itemId)))) {
    return NextResponse.json({ message: 'Pohjassa on kamoja joita ei voi lainata' }, { status: 400 });
  }

  const existing = await prisma.template.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ message: 'Pohjaa ei löytynyt' }, { status: 404 });
  }

  // Replace the item list rather than diffing it: the rows carry no identity of
  // their own (no history, nothing references them), so a wipe and recreate
  // inside one transaction is both simpler and atomic. Rows pointing at
  // archived items are spared — the admin never saw them in the form, so
  // "saving" must not silently drop what restoring the item would bring back.
  // No unique-constraint clash is possible: `allItemsLoanable` already rejected
  // any archived id in the incoming list.
  const template = await prisma.$transaction(async (tx) => {
    await tx.templateItem.deleteMany({
      where: { templateId: id, item: { deletedAt: null } },
    });
    return tx.template.update({
      where: { id },
      data: { name, description, items: { create: items } },
      include: templateItemsInclude,
    });
  });

  return NextResponse.json({ template: toTemplateView(template) });
}
