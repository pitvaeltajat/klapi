export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { templateItemsInclude, toTemplateView } from '@/utils/templateQueries';
import TemplatesView from './TemplatesView';

export const metadata = { title: 'Lainapohjat | Klapi' };

export default async function TemplatesPage() {
  const [templates, archivedRows, items] = await Promise.all([
    prisma.template.findMany({ include: templateItemsInclude, orderBy: { name: 'asc' } }),
    // Rows the loaner-facing read filters out. The admin still needs to know
    // they exist, otherwise a template that lost an item to the archive looks
    // like it silently shrank — and one that lost *all* of them looks empty.
    prisma.templateItem.groupBy({
      by: ['templateId'],
      where: { item: { deletedAt: { not: null } } },
      _count: { _all: true },
    }),
    // Only what a template may legally contain: live, non-temporary items.
    prisma.item.findMany({
      where: { deletedAt: null, type: 'normal' },
      select: { id: true, name: true, amount: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <TemplatesView
      templates={templates.map(toTemplateView)}
      archivedCounts={Object.fromEntries(
        archivedRows.map((row) => [row.templateId, row._count._all]),
      )}
      items={items}
    />
  );
}
