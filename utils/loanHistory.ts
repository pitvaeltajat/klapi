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

export function getLoanHistoryActionLabel(action: LoanHistoryAction): string {
  switch (action) {
    case 'CREATED':
      return 'Laina luotu';
    case 'UPDATED':
      return 'Lainaa muokattu';
    case 'APPROVED':
      return 'Laina hyväksytty';
    case 'REJECTED':
      return 'Laina hylätty';
    case 'STARTED':
      return 'Lainaus aloitettu';
    case 'RETURNED_TO_BOX':
      return 'Kamat palautettu laatikkoon';
    case 'PROCESSED_FROM_BOX':
      return 'Kamat merkitty palautetuksi';
    default:
      return action;
  }
}
