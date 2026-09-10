import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

// See getCategories: Finnish collation, not Postgres'.
const fiCollator = new Intl.Collator('fi');

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const locations = await prisma.location.findMany();
  locations.sort((a, b) => fiCollator.compare(a.name, b.name));
  return NextResponse.json(locations);
}
