import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/utils/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getServerSession(authOptions);
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
  const session = await getServerSession(authOptions);
  const { userId } = await params;

  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

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
  const session = await getServerSession(authOptions);
  const { userId } = await params;

  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

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
  const session = await getServerSession(authOptions);
  const { userId } = await params;

  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

  try {
    // Soft delete: mark the user deleted instead of removing the row, so their
    // loans and loan history survive (Loan.user is onDelete: Cascade — a hard
    // delete would take the whole ledger with it). Deleted users are filtered
    // out of auth, listings, elevation, and email recipients. Restore by
    // clearing deletedAt. Idempotent: re-deleting keeps the original timestamp.
    const user = await prisma.user.update({
      where: {
        id: userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json(err);
  }
}
