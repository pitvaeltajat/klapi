import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const categories = await prisma.category.findMany();
  return NextResponse.json(categories);
}
