import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

/**
 * Hard delete — unlike items and users, a template is a convenience shortcut
 * that nothing else references, so there's no history to keep alive. The
 * TemplateItem rows go with it via the FK cascade.
 */
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await request.json();
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ message: 'Pohjaa ei löytynyt' }, { status: 400 });
  }

  const existing = await prisma.template.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ message: 'Pohjaa ei löytynyt' }, { status: 404 });
  }

  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
