import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const locations = await prisma.location.findMany();
  return NextResponse.json(locations);
}
