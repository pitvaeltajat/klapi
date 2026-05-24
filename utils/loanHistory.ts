import { LoanHistoryAction, Prisma } from '@prisma/client';
import type { Session } from 'next-auth';
import prisma from './prisma';

/**
 * Resolves who should be recorded as the actor for a loan-history entry.
 *
 * On the kiosk an admin can temporarily elevate the session via PIN. While
 * elevated the session id still points at the KIOSK user, so attributing
 * events to `session.user.id` would show "Kaluston kone" instead of the admin.
 * When `elevatedById` is present we attribute the event to that admin and flag
 * it as having been performed at the kiosk.
 */
export function resolveLoanActor(session: Session | null | undefined): {
  actedById: string | null;
  viaKiosk: boolean;
} {
  const elevatedById = session?.user?.elevatedById ?? null;
  if (elevatedById) {
    return { actedById: elevatedById, viaKiosk: true };
  }
  return { actedById: session?.user?.id ?? null, viaKiosk: false };
}

export async function logLoanHistory(params: {
  loanId: string;
  action: LoanHistoryAction;
  actedById?: string | null;
  viaKiosk?: boolean;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const details: Record<string, unknown> = { ...(params.details ?? {}) };
    if (params.viaKiosk) {
      details.viaKiosk = true;
    }
    await prisma.loanHistory.create({
      data: {
        loanId: params.loanId,
        action: params.action,
        actedById: params.actedById ?? null,
        details:
          Object.keys(details).length > 0
            ? (details as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error('Failed to log loan history:', err);
  }
}
