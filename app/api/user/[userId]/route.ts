import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { auth } from '@/lib/auth';
import { requireAdmin } from '@/utils/apiAuth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  const { userId } = await params;

  // allow only admins to do this, or the user himself
  if (session?.user?.group === 'ADMIN' || session?.user?.id === userId) {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
      return NextResponse.json(user);
    } catch (err) {
      return NextResponse.json(err);
    }
  } else {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { userId } = await params;

  const body = await request.json();

  try {
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name: body.name,
        email: body.email,
        group: body.group,
      },
    });
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json(err, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { userId } = await params;

  const body = await request.json();
  const newGroup = body.group as 'ADMIN' | 'USER';

  try {
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        group: newGroup,
      },
    });
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json(err, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { userId } = await params;

  try {
    // Soft delete: mark the user deleted instead of removing the row, so their
    // loans and loan history survive (Loan.user is onDelete: Cascade — a hard
    // delete would take the whole ledger with it). Deleted users are filtered
    // out of auth, listings, elevation, and email recipients. Restore by
    // clearing deletedAt. Idempotent: re-deleting keeps the original timestamp.
    //
    // `deletedBySync: false` marks this as a human's decision, which the nightly
    // Workspace sync (utils/userSync.ts) will not undo — deleting someone here
    // sticks even while they are still a Workspace member.
    const user = await prisma.user.update({
      where: {
        id: userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedBySync: false,
      },
    });
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json(err);
  }
}
