import { Group } from '@prisma/client';
import prisma from '@/utils/prisma';

/**
 * Folds a duplicate `User` into a primary one.
 *
 * Several members hold two Klapi accounts — one created years ago from a
 * personal Gmail, one under their `@pitkajarvenvaeltajat.fi` address — with
 * their loan history split across the pair. This moves everything the duplicate
 * owns onto the primary and soft-deletes the duplicate.
 *
 * Everything that references a user moves: `Loan`, `EmailLog`, and the two
 * audit logs (`LoanHistory.actedById`, `ItemHistory.actedById`, so "kuka teki"
 * still resolves to a live account). `Account`/`Session` move too — they are
 * vestigial today, since `lib/auth.ts` configures no NextAuth adapter and
 * matches on email instead, but leaving orphans behind would be sloppy.
 *
 * None of those tables has a unique constraint on the user column, so the moves
 * cannot collide. The whole thing runs in one transaction: a merge either lands
 * completely or not at all.
 *
 * The duplicate is **soft-deleted, not removed** — its row keeps the personal
 * email, so `lib/auth.ts` refuses that Google login rather than minting a fresh
 * empty account for it. `mergedIntoId` records where the data went.
 *
 * ## Group
 *
 * The primary is raised to the duplicate's group when the duplicate was the
 * more privileged of the two, so merging can never demote someone out of their
 * own admin panel. KIOSK is not on that ladder and is refused outright — the
 * shared terminal is not a person and must never absorb, or be absorbed into,
 * one.
 */

export type MergeUsersResult = {
  primaryEmail: string | null;
  duplicateEmail: string | null;
  moved: {
    loans: number;
    emailLogs: number;
    loanHistory: number;
    itemHistory: number;
    accounts: number;
    sessions: number;
  };
  /** Set when the primary had to be raised to the duplicate's group. */
  promotedTo: Group | null;
  dryRun: boolean;
};

export class MergeUsersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MergeUsersError';
  }
}

/** ADMIN outranks USER. KIOSK is deliberately absent — it never merges. */
const RANK: Record<string, number> = { USER: 0, ADMIN: 1 };

export async function mergeUsers(
  { primaryId, duplicateId }: { primaryId: string; duplicateId: string },
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<MergeUsersResult> {
  if (primaryId === duplicateId) {
    throw new MergeUsersError('Cannot merge a user into themselves');
  }

  const [primary, duplicate] = await Promise.all([
    prisma.user.findUnique({
      where: { id: primaryId },
      select: { id: true, email: true, group: true, deletedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: duplicateId },
      select: { id: true, email: true, group: true, deletedAt: true },
    }),
  ]);

  if (!primary) throw new MergeUsersError(`Primary user ${primaryId} not found`);
  if (!duplicate) throw new MergeUsersError(`Duplicate user ${duplicateId} not found`);

  if (primary.deletedAt) {
    throw new MergeUsersError(`Primary user ${primary.email} is deleted — merge into a live account`);
  }
  if (duplicate.deletedAt) {
    throw new MergeUsersError(`Duplicate user ${duplicate.email} is already deleted`);
  }
  if (primary.group === Group.KIOSK || duplicate.group === Group.KIOSK) {
    throw new MergeUsersError('Refusing to merge a KIOSK terminal');
  }

  const promotedTo =
    RANK[duplicate.group] > RANK[primary.group] ? (duplicate.group as Group) : null;

  const counts = async () => ({
    loans: await prisma.loan.count({ where: { userId: duplicateId } }),
    emailLogs: await prisma.emailLog.count({ where: { userId: duplicateId } }),
    loanHistory: await prisma.loanHistory.count({ where: { actedById: duplicateId } }),
    itemHistory: await prisma.itemHistory.count({ where: { actedById: duplicateId } }),
    accounts: await prisma.account.count({ where: { userId: duplicateId } }),
    sessions: await prisma.session.count({ where: { userId: duplicateId } }),
  });

  if (dryRun) {
    return {
      primaryEmail: primary.email,
      duplicateEmail: duplicate.email,
      moved: await counts(),
      promotedTo,
      dryRun: true,
    };
  }

  const moved = await prisma.$transaction(async (tx) => {
    const loans = await tx.loan.updateMany({
      where: { userId: duplicateId },
      data: { userId: primaryId },
    });
    const emailLogs = await tx.emailLog.updateMany({
      where: { userId: duplicateId },
      data: { userId: primaryId },
    });
    const loanHistory = await tx.loanHistory.updateMany({
      where: { actedById: duplicateId },
      data: { actedById: primaryId },
    });
    const itemHistory = await tx.itemHistory.updateMany({
      where: { actedById: duplicateId },
      data: { actedById: primaryId },
    });
    const accounts = await tx.account.updateMany({
      where: { userId: duplicateId },
      data: { userId: primaryId },
    });
    const sessions = await tx.session.updateMany({
      where: { userId: duplicateId },
      data: { userId: primaryId },
    });

    if (promotedTo) {
      await tx.user.update({ where: { id: primaryId }, data: { group: promotedTo } });
    }

    // `deletedBySync: false` — a person decided this, so the Workspace sync must
    // never undo it (it would not anyway: the duplicate is off-domain).
    await tx.user.update({
      where: { id: duplicateId },
      data: { deletedAt: new Date(), deletedBySync: false, mergedIntoId: primaryId },
    });

    return {
      loans: loans.count,
      emailLogs: emailLogs.count,
      loanHistory: loanHistory.count,
      itemHistory: itemHistory.count,
      accounts: accounts.count,
      sessions: sessions.count,
    };
  });

  return {
    primaryEmail: primary.email,
    duplicateEmail: duplicate.email,
    moved,
    promotedTo,
    dryRun: false,
  };
}
