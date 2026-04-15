import { LoanHistoryAction, Prisma } from '@prisma/client';
import prisma from './prisma';

export async function logLoanHistory(params: {
  loanId: string;
  action: LoanHistoryAction;
  actedById?: string | null;
  details?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.loanHistory.create({
      data: {
        loanId: params.loanId,
        action: params.action,
        actedById: params.actedById ?? null,
        details: params.details ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error('Failed to log loan history:', err);
  }
}
