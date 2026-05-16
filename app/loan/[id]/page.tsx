export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { notFound } from 'next/navigation';
import LoanView from './LoanView';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loan = await prisma.loan.findUnique({
    where: { id },
    select: { description: true },
  });
  return { title: `Laina: ${loan?.description || 'Ei kuvausta'} | Klapi` };
}

export default async function LoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [loan, reports, history] = await Promise.all([
    prisma.loan.findUnique({
      where: { id },
      include: {
        user: true,
        box: true,
        reservations: { include: { item: true } },
      },
    }),
    prisma.report.findMany({
      where: { loanId: id },
      select: { id: true, content: true, createdAt: true, status: true },
    }),
    prisma.loanHistory.findMany({
      where: { loanId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        actedBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  if (!loan) notFound();

  return (
    <LoanView
      loan={serialize(loan)}
      reports={serialize(reports)}
      history={serialize(history)}
    />
  );
}
