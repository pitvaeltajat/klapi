import { Group } from '@prisma/client';
import prisma from '@/utils/prisma';
import type { WorkspaceMember } from '@/utils/googleWorkspace';

/**
 * Reconciles Klapi's `User` table against the Google Workspace roster.
 *
 * Takes an already-fetched roster rather than calling Google itself, so the
 * decision logic — which is the part that can lock people out — is testable
 * without a network or a service-account key. `cron/syncWorkspaceUsers` pairs
 * it with `fetchWorkspaceRoster`.
 *
 * ## What it governs
 *
 * Only accounts that Workspace can plausibly be the source of truth for: a
 * `@<domain>` email and a group other than KIOSK. Everything else — the local
 * `admin` account, the shared `pitva` kiosk terminal, anyone who signed in with
 * a personal Gmail — is invisible to the sync and stays hand-managed.
 *
 * ## What it does
 *
 * - **creates** a USER row for an active member who has none, so the whole
 *   troop shows up in `/admin` and `LoanerAutocomplete` before they have ever
 *   logged in (Google sign-in would otherwise only create the row on first
 *   login);
 * - **renames** a row whose name drifted from the directory;
 * - **restores** a member the sync itself had deactivated (they came back);
 * - **deactivates** — soft-delete, `deletedAt` stamped — a governed account
 *   that is gone from Workspace, suspended, archived, or out of the group.
 *   Loans and loan history survive; `lib/auth.ts` refuses the login.
 *
 * ## Guards
 *
 * Deactivation is the destructive half, so it is fenced three ways: an empty
 * active set aborts the whole run, a run that would deactivate more than
 * `maxDeactivations` accounts aborts before writing anything, and the last live
 * ADMIN is never deactivated (nobody can be locked out of their own admin
 * panel by a bad roster read).
 */

/** Everything the sync changed, for the cron's response and the log line. */
export type UserSyncResult = {
  created: string[];
  renamed: string[];
  restored: string[];
  deactivated: string[];
  /** Governed, gone from Workspace, but deliberately left alone (last admin). */
  keptAlive: string[];
  dryRun: boolean;
};

export type UserSyncOptions = {
  /** Workspace domain, without the `@` — governs which Klapi rows are in scope. */
  domain: string;
  /**
   * Domain addresses the sync must ignore completely: never provisioned, never
   * deactivated, exactly like a non-Workspace account. For the robot accounts
   * that are Workspace users but not people — `admin@`, `pitvadev@`. They would
   * otherwise be swept in, because the member group carries a whole-organisation
   * member (see `fetchWorkspaceRoster`) that puts every domain user in it.
   */
  excludeEmails?: string[];
  /** Report what would change without writing anything. */
  dryRun?: boolean;
  /**
   * Circuit breaker: abort instead of deactivating more than this many accounts
   * in one run. A roster read that half-fails should page a human, not quietly
   * empty the user table.
   */
  maxDeactivations?: number;
};

const DEFAULT_MAX_DEACTIVATIONS = 10;

export class UserSyncAbort extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserSyncAbort';
  }
}

export async function syncWorkspaceUsers(
  roster: WorkspaceMember[],
  options: UserSyncOptions,
): Promise<UserSyncResult> {
  const {
    domain,
    excludeEmails = [],
    dryRun = false,
    maxDeactivations = DEFAULT_MAX_DEACTIVATIONS,
  } = options;

  const excluded = new Set(excludeEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));

  const active = new Map(
    roster
      .filter((member) => member.active && !excluded.has(member.email.toLowerCase()))
      .map((member) => [member.email.toLowerCase(), member]),
  );

  // A roster with nobody in it is a failure, not an instruction to delete
  // everyone. `fetchWorkspaceRoster` already throws on an empty API response;
  // this covers a roster that is non-empty but has no *active* member.
  if (active.size === 0) {
    throw new UserSyncAbort('Workspace roster contains no active members — refusing to sync');
  }

  // Governed rows, soft-deleted ones included: a returning member is matched
  // here rather than created a second time (`email` is unique, so the create
  // would fail anyway).
  const governed = (
    await prisma.user.findMany({
      where: {
        group: { not: Group.KIOSK },
        email: { endsWith: `@${domain}`, mode: 'insensitive' },
      },
      select: {
        id: true,
        email: true,
        name: true,
        group: true,
        deletedAt: true,
        deletedBySync: true,
      },
    })
  ).filter((user) => !excluded.has(user.email!.toLowerCase()));

  const byEmail = new Map(governed.map((user) => [user.email!.toLowerCase(), user]));

  const liveAdmins = governed.filter(
    (user) => user.group === Group.ADMIN && user.deletedAt === null,
  ).length;

  const result: UserSyncResult = {
    created: [],
    renamed: [],
    restored: [],
    deactivated: [],
    keptAlive: [],
    dryRun,
  };

  // --- Plan the deactivations first, so the circuit breaker can abort the run
  // --- before a single write lands.
  const toDeactivate = governed.filter(
    (user) => user.deletedAt === null && !active.has(user.email!.toLowerCase()),
  );

  if (toDeactivate.length > maxDeactivations) {
    throw new UserSyncAbort(
      `Refusing to deactivate ${toDeactivate.length} accounts in one run ` +
        `(limit ${maxDeactivations}): ${toDeactivate.map((user) => user.email).join(', ')}`,
    );
  }

  // --- Additive half: create, rename, restore.
  for (const [email, member] of active) {
    const existing = byEmail.get(email);

    if (!existing) {
      result.created.push(email);
      if (!dryRun) {
        await prisma.user.create({
          data: { email, name: member.name, group: Group.USER },
        });
      }
      continue;
    }

    // A human's delete outranks the roster: leave it, and don't rename a row
    // nobody can log into either.
    if (existing.deletedAt && !existing.deletedBySync) continue;

    if (existing.deletedAt) {
      result.restored.push(email);
      if (!dryRun) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { deletedAt: null, deletedBySync: false },
        });
      }
    }

    if (member.name && member.name !== existing.name) {
      result.renamed.push(email);
      if (!dryRun) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { name: member.name },
        });
      }
    }
  }

  // --- Destructive half.
  let remainingAdmins = liveAdmins;
  for (const user of toDeactivate) {
    if (user.group === Group.ADMIN && remainingAdmins <= 1) {
      result.keptAlive.push(user.email!);
      continue;
    }
    if (user.group === Group.ADMIN) remainingAdmins -= 1;

    result.deactivated.push(user.email!);
    if (!dryRun) {
      await prisma.user.update({
        where: { id: user.id, deletedAt: null },
        data: { deletedAt: new Date(), deletedBySync: true },
      });
    }
  }

  return result;
}
