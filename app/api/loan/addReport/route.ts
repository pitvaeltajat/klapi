import { NextResponse } from 'next/server';
import { ReportCreated } from '@prisma/client';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

export async function POST(request: Request) {
  try {
    const { denied } = await requireAdmin();
    if (denied) return denied;

    const body = (await request.json()) as {
      loanId?: unknown;
      content?: unknown;
      created?: unknown;
    };
    const { loanId, content, created } = body;

    if (typeof loanId !== 'string' || loanId === '') {
      return NextResponse.json({ message: 'Lainan ID puuttuu' }, { status: 400 });
    }
    if (typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ message: 'Sisältö puuttuu' }, { status: 400 });
    }
    const isReportCreated = (v: unknown): v is ReportCreated =>
      (Object.values(ReportCreated) as string[]).includes(v as string);
    if (!isReportCreated(created)) {
      return NextResponse.json({ message: 'Virheellinen tyyppi' }, { status: 400 });
    }

    const loan = await prisma.loan.findUnique({ where: { id: loanId }, select: { id: true, deletedAt: true } });
    if (!loan || loan.deletedAt) {
      return NextResponse.json({ message: 'Lainaa ei löydy' }, { status: 404 });
    }

    const report = await prisma.report.create({
      data: { loanId, content: content.trim(), created },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Virhe lisättäessä huomiota:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
