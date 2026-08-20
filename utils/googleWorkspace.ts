import { createSign } from 'node:crypto';

/**
 * Read-only client for the Google Workspace Admin SDK Directory API.
 *
 * Authenticates as a **service account with domain-wide delegation**, not as a
 * signed-in person: the SA mints a JWT, impersonates `GOOGLE_WORKSPACE_SUBJECT`
 * (an account with the "read users" admin privilege) and exchanges it for an
 * access token. That is the only Google auth flow that works unattended, which
 * is what the nightly `cron/syncWorkspaceUsers` needs.
 *
 * Hand-rolled rather than via `google-auth-library`: the whole flow is one
 * signed JWT and one form POST, and the library would pull half a dozen
 * transitive deps in for it.
 *
 * Setup lives in `README.md` (§ Google Workspace user sync) — the SA needs
 * exactly these two scopes authorised in Admin console → Security → API
 * controls → Domain-wide delegation, and nothing else.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DIRECTORY_URL = 'https://admin.googleapis.com/admin/directory/v1';

const SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
].join(' ');

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

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * The SA key from `GOOGLE_WORKSPACE_SA_KEY`. Accepts the raw JSON Google hands
 * you or a base64 blob of it — base64 is what actually survives a paste into
 * the Vercel env editor without the newlines in `private_key` being mangled.
 */
function loadServiceAccountKey(): ServiceAccountKey {
  const raw = requireEnv('GOOGLE_WORKSPACE_SA_KEY').trim();
  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');

  let parsed: Partial<ServiceAccountKey>;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('GOOGLE_WORKSPACE_SA_KEY is not valid JSON (raw or base64-encoded)');
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_WORKSPACE_SA_KEY is missing client_email or private_key');
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

/** Signed JWT → OAuth access token, impersonating the delegated subject. */
async function getAccessToken(): Promise<string> {
  const key = loadServiceAccountKey();
  const subject = requireEnv('GOOGLE_WORKSPACE_SUBJECT');

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: key.client_email,
      sub: subject,
      scope: SCOPES,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${base64url(signer.sign(key.private_key))}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const body = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !body.access_token) {
    // `unauthorized_client` here almost always means the two scopes above are
    // not authorised for this SA's client id in the Admin console.
    throw new Error(
      `Google token exchange failed (${response.status}): ${body.error_description ?? 'unknown error'}`,
    );
  }
  return body.access_token;
}

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
  const token = await getAccessToken();

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
          (wholeDomainIsMember || explicitMembers.has(email)) &&
          !user.suspended &&
          !user.archived,
      };
    });
}
