/**
 * Folds duplicate Klapi accounts into their `@pitkajarvenvaeltajat.fi` primary.
 *
 * Several members predate the Workspace sync and hold two accounts — one from a
 * personal Gmail, one under their work address — with loan history split across
 * the pair. This walks a list of `duplicate → primary` email pairs and merges
 * each one (see `utils/mergeUsers.ts` for what moves).
 *
 * Pairs are given as **emails**, which are unique in the schema, and resolved to
 * ids before anything is written. Deliberately not matched on `name` at
 * runtime: names are free text, two members share a surname often enough, and
 * merging the wrong two people is not something you want a heuristic deciding.
 * The list below was reviewed by hand.
 *
 *   pnpm tsx scripts/merge-users.ts            # dry run — reports, writes nothing
 *   pnpm tsx scripts/merge-users.ts --apply    # do it
 *
 * Idempotent: an already-merged duplicate is soft-deleted, so a second run skips
 * it instead of failing.
 */

import { mergeUsers, MergeUsersError } from '@/utils/mergeUsers';
import prisma from '@/utils/prisma';

/** `[duplicate email, primary email]`, confirmed by exact full-name match. */
const PAIRS: Array<[duplicate: string, primary: string]> = [
  ['kristian.juhani@gmail.com', 'kristian.karjalainen@pitkajarvenvaeltajat.fi'],
  ['martta.vaahteranoksa@gmail.com', 'martta.vaahteranoksa@pitkajarvenvaeltajat.fi'],
  ['valtteri.torsti@gmail.com', 'valtteri.torsti@pitkajarvenvaeltajat.fi'],
  ['axbergkalle@gmail.com', 'kalle.axberg@pitkajarvenvaeltajat.fi'],
  ['sisukanerva@gmail.com', 'sisu.kanerva@pitkajarvenvaeltajat.fi'],
  ['usva.muhonen@eduespoo.fi', 'usva.muhonen@pitkajarvenvaeltajat.fi'],
  ['eevi.tuom@gmail.com', 'eevi.tuomala@pitkajarvenvaeltajat.fi'],
  ['inkeri.vaahteranoksa@gmail.com', 'inkeri.vaahteranoksa@pitkajarvenvaeltajat.fi'],
  ['olli.tunkelo@gmail.com', 'olli.tunkelo@pitkajarvenvaeltajat.fi'],
  ['outi.kauppinen20@gmail.com', 'outi.kauppinen@pitkajarvenvaeltajat.fi'],
  ['paavali.keppo@gmail.com', 'paavali.keppo@pitkajarvenvaeltajat.fi'],
  ['viivi.osterholm@gmail.com', 'viivi.osterholm@pitkajarvenvaeltajat.fi'],
  ['hymy.hietakymi@eduespoo.fi', 'hymy.hietakymi@pitkajarvenvaeltajat.fi'],
  ['niina.hurme@gmail.com', 'niina.hurme@pitkajarvenvaeltajat.fi'],
  ['thpentti@gmail.com', 'teemu.penttila@pitkajarvenvaeltajat.fi'],
];

async function main() {
  const apply = process.argv.includes('--apply');
  const dryRun = !apply;

  console.log(dryRun ? '— DRY RUN, nothing will be written —\n' : '— APPLYING —\n');

  let merged = 0;
  let skipped = 0;
  const totals = { loans: 0, emailLogs: 0, loanHistory: 0, itemHistory: 0 };

  for (const [duplicateEmail, primaryEmail] of PAIRS) {
    const [duplicate, primary] = await Promise.all([
      prisma.user.findUnique({
        where: { email: duplicateEmail },
        select: { id: true, deletedAt: true },
      }),
      prisma.user.findUnique({ where: { email: primaryEmail }, select: { id: true } }),
    ]);

    if (!duplicate || !primary) {
      console.log(`SKIP  ${duplicateEmail} → ${primaryEmail}  (${!duplicate ? 'duplicate' : 'primary'} not found)`);
      skipped += 1;
      continue;
    }
    if (duplicate.deletedAt) {
      console.log(`SKIP  ${duplicateEmail} → ${primaryEmail}  (already merged/deleted)`);
      skipped += 1;
      continue;
    }

    try {
      const result = await mergeUsers(
        { primaryId: primary.id, duplicateId: duplicate.id },
        { dryRun },
      );
      const { loans, emailLogs, loanHistory, itemHistory } = result.moved;
      totals.loans += loans;
      totals.emailLogs += emailLogs;
      totals.loanHistory += loanHistory;
      totals.itemHistory += itemHistory;
      merged += 1;
      console.log(
        `${dryRun ? 'WOULD' : 'OK   '} ${duplicateEmail} → ${primaryEmail}  ` +
          `loans=${loans} emailLogs=${emailLogs} loanHistory=${loanHistory} itemHistory=${itemHistory}` +
          (result.promotedTo ? `  (primary raised to ${result.promotedTo})` : ''),
      );
    } catch (error) {
      skipped += 1;
      const message = error instanceof MergeUsersError ? error.message : String(error);
      console.log(`FAIL  ${duplicateEmail} → ${primaryEmail}  ${message}`);
    }
  }

  console.log(
    `\n${merged} merged, ${skipped} skipped. Moved: ` +
      `${totals.loans} loans, ${totals.emailLogs} email logs, ` +
      `${totals.loanHistory} loan-history, ${totals.itemHistory} item-history rows.`,
  );
  if (dryRun) console.log('Re-run with --apply to write.');

  await prisma.$disconnect();
}

main();
