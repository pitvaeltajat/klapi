import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireUser } from '@/utils/apiAuth';
import { templateItemsInclude, toTemplateView } from '@/utils/templateQueries';

/** Every signed-in caller — loaners and the kiosk terminal alike — may read these. */
export async function GET() {
  const { denied } = await requireUser();
  if (denied) return denied;

  const templates = await prisma.template.findMany({
    include: templateItemsInclude,
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ templates: templates.map(toTemplateView) });
}
