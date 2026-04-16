import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Ei kirjautunut sisään' }, { status: 401 });
    }

    const { loanId, content, created } = await request.json();
    if (!loanId || !content) {
      return NextResponse.json({ message: 'loanId ja content vaaditaan' }, { status: 400 });
    }
    const report = await prisma.report.create({
      data: {
        loanId: loanId,
        content: content,
        created: created || 'AFTER_LOAN',
      },
    });
    return NextResponse.json({ report });
  } catch (error) {
    console.error('Virhe luotaessa raporttia:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
