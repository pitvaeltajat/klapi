import { getGoogleAccessToken, requireEnv } from '@/utils/googleAuth';

/**
 * Read-only client for the Google Workspace Admin SDK Directory API.
 *
 * Authenticates as a **service account with domain-wide delegation**, not as a
 * signed-in person: the SA impersonates `GOOGLE_WORKSPACE_SUBJECT` (an account
 * with the "read users" admin privilege), which is the only Google auth flow
 * that works unattended — see `utils/googleAuth`.
 *
 * Setup lives in `README.md` (§ Google Workspace user sync) — the SA needs
 * exactly these two scopes authorised in Admin console → Security → API
 * controls → Domain-wide delegation, and nothing else. (The loan calendar in
 * `utils/googleCalendar` deliberately stays out of that grant: it is shared
 * with the SA directly instead.)
 */

const DIRECTORY_URL = 'https://admin.googleapis.com/admin/directory/v1';

const SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
];

/** One Workspace person as the sync cares about them. */
export type WorkspaceMember = {
  /** Primary email, lowercased — the key we match Klapi's `User.email` on. */
  email: string;
  /** Full name from the directory, or null if Workspace has none. */
  name: string | null;
  /**
   * True when this person should have a working Klapi account: they exist in
   * the directory, are in the member group, and are neither suspended nor
   * archived. Anyone *deleted* from Workspace simply never appears in the
   * roster at all.
   */
  active: boolean;
};

/** GETs one Directory endpoint, following `nextPageToken` to the end. */
async function directoryList<T>(
  token: string,
  path: string,
  params: Record<string, string>,
  collect: (page: Record<string, unknown>) => T[],
): Promise<T[]> {
  const results: T[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${DIRECTORY_URL}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      throw new Error(`Directory API ${path} failed (${response.status}): ${await response.text()}`);
    }

    const page = (await response.json()) as Record<string, unknown>;
    results.push(...collect(page));
    pageToken = page.nextPageToken as string | undefined;
  } while (pageToken);

  return results;
}

type DirectoryUser = {
  primaryEmail?: string;
  name?: { fullName?: string };
  suspended?: boolean;
  archived?: boolean;
};

type DirectoryMember = {
  email?: string;
  type?: string;
  status?: string;
};

/**
 * The current Workspace roster: every user in the domain, flagged `active` when
 * they belong to `GOOGLE_WORKSPACE_GROUP` and are neither suspended nor
 * archived.
 *
 * The "belongs to the group" test has a wrinkle. `jasenet@` carries a
 * `type: CUSTOMER` member — Workspace's "the whole organisation is in this
 * group" entry — alongside its explicit per-person rows. The API returns that
 * entry verbatim instead of expanding it, so an explicit-membership-only read
 * would miss anyone who is covered by it but hasn't been added by hand (the
 * explicit roster is topped up by `~/bin/pitva-calendar-sync.sh`, which only
 * runs when someone remembers to). When the CUSTOMER member is present we
 * therefore treat every domain user as a member, which is what it actually
 * means — and a new member gets their Klapi account the night they're created,
 * without waiting for that script.
 *
 * Throws rather than returning an empty roster: a Klapi-wide deactivation must
 * never be the result of an API hiccup.
 */
export async function fetchWorkspaceRoster(): Promise<WorkspaceMember[]> {
  const domain = requireEnv('GOOGLE_WORKSPACE_DOMAIN');
  const group = requireEnv('GOOGLE_WORKSPACE_GROUP');
  const token = await getGoogleAccessToken(SCOPES, requireEnv('GOOGLE_WORKSPACE_SUBJECT'));

  const [users, members] = await Promise.all([
    directoryList<DirectoryUser>(
      token,
      '/users',
      { domain, maxResults: '500', projection: 'basic' },
      (page) => (page.users as DirectoryUser[]) ?? [],
    ),
    directoryList<DirectoryMember>(
      token,
      `/groups/${encodeURIComponent(group)}/members`,
      { maxResults: '200' },
      (page) => (page.members as DirectoryMember[]) ?? [],
    ),
  ]);

  if (users.length === 0) {
    throw new Error(`Directory returned no users for domain ${domain}`);
  }
  if (members.length === 0) {
    throw new Error(`Directory returned no members for group ${group}`);
  }

  const wholeDomainIsMember = members.some((member) => member.type === 'CUSTOMER');
  const explicitMembers = new Set(
    members
      .filter((member) => member.type === 'USER' && member.email)
      .map((member) => member.email!.toLowerCase()),
  );

  return users
    .filter((user) => user.primaryEmail)
    .map((user) => {
      const email = user.primaryEmail!.toLowerCase();
      return {
        email,
        name: user.name?.fullName?.trim() || null,
        active:
          (wholeDomainIsMember || explicitMembers.has(email)) && !user.suspended && !user.archived,
      };
    });
}
