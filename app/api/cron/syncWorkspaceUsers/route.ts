import { NextResponse } from 'next/server';
import { fetchWorkspaceRoster } from '@/utils/googleWorkspace';
import { syncWorkspaceUsers, UserSyncAbort } from '@/utils/userSync';
import prisma from '@/utils/prisma';

// Nightly Google Workspace → Klapi user sync (see vercel.json). Provisions a
// Klapi account for every member of the Workspace group, keeps their names
// current, and soft-deletes anyone who has been deleted, suspended or removed
// from the group — so a departed member loses Klapi access on their own,
// without their loans or loan history going with them.
//
// `?dryRun=1` reports what a run would change without writing. Handy right
// after a credential change:
//
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//     "https://<host>/api/cron/syncWorkspaceUsers?dryRun=1"
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron or has authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';

  try {
    const roster = await fetchWorkspaceRoster();
    const result = await syncWorkspaceUsers(roster, {
      domain: process.env.GOOGLE_WORKSPACE_DOMAIN!,
      excludeEmails: (process.env.GOOGLE_WORKSPACE_EXCLUDE ?? '').split(','),
      dryRun,
      maxDeactivations: process.env.WORKSPACE_SYNC_MAX_DEACTIVATIONS
        ? Number(process.env.WORKSPACE_SYNC_MAX_DEACTIVATIONS)
        : undefined,
    });

    console.log(
      `Workspace sync${dryRun ? ' (dry run)' : ''}: ` +
        `${roster.filter((member) => member.active).length} active member(s), ` +
        `created ${result.created.length}, renamed ${result.renamed.length}, ` +
        `restored ${result.restored.length}, deactivated ${result.deactivated.length}` +
        (result.keptAlive.length ? `, kept last admin ${result.keptAlive.join(', ')}` : ''),
    );

    return NextResponse.json({
      message: 'Workspace user sync completed',
      rosterSize: roster.length,
      activeMembers: roster.filter((member) => member.active).length,
      ...result,
    });
  } catch (error) {
    // An abort is the guard doing its job — a roster that looks wrong is worth
    // a distinct status so it stands out from a Google/DB outage in the logs.
    if (error instanceof UserSyncAbort) {
      console.error('Workspace sync aborted:', error.message);
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    console.error('Workspace user sync error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to sync Workspace users' },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
