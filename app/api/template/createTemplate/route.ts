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
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : null;

  if (!name) {
    return NextResponse.json({ message: 'Anna pohjalle nimi' }, { status: 400 });
  }

  // Always an explicit item list: "tallenna pohjaksi" derives its rows from the
  // loan client-side and lets the admin edit them before posting, so the server
  // never has to guess what the admin saw.
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

  const template = await prisma.template.create({
    data: { name, description, items: { create: items } },
    include: templateItemsInclude,
  });

  return NextResponse.json({ template: toTemplateView(template) });
}
