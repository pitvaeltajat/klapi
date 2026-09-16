import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { canBeParent, withPaths } from '@/utils/locationTree';

/**
 * The parent check every sijainti write shares. Returns a response to send back
 * when the parent is refused, or null when it may go ahead. Any sijainti can
 * hold another — a lainattava one included, whose whole subtree then goes out
 * with it.
 */
export async function refuseParent(id: string | null, parentId: string | null) {
  if (parentId === null) return null;
  const locations = await prisma.location.findMany({ select: treeSelect });
  const parent = locations.find((l) => l.id === parentId);
  if (!parent) {
    return NextResponse.json({ message: 'Yläsijaintia ei löytynyt' }, { status: 400 });
  }
  if (id && !canBeParent(locations, id, parentId)) {
    return NextResponse.json(
      { message: 'Sijaintia ei voi siirtää itsensä tai oman alasijaintinsa sisään' },
      { status: 400 },
    );
  }
  return null;
}

const treeSelect = { id: true, name: true, parentId: true } as const;

/** Sijainti id → "Kalusto / Hylly 3", for anything that shows a kama's place. */
export async function locationPaths(): Promise<Map<string, string>> {
  const locations = await prisma.location.findMany({ select: treeSelect });
  return new Map(withPaths(locations).map((l) => [l.id, l.path]));
}

/** `parentId` from a request body: a string id, or null for the top level. */
export const readParentId = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;
