import { createSign } from 'node:crypto';

/**
 * Service-account auth for every Google API Klapi talks to.
 *
 * The service account mints a JWT, signs it with its private key and exchanges
 * it for an access token. That is the only Google auth flow that works
 * unattended, which is what the nightly `cron/syncWorkspaceUsers` and the
 * calendar mirror both need — there is no signed-in person in either.
 *
 * Two shapes of token come out of here:
 *
 * - **Impersonating** (`subject` set) — domain-wide delegation. The SA acts as
 *   a person in the domain. `utils/googleWorkspace` needs this: only an admin
 *   may read the Directory. It requires the scopes to be authorised for the
 *   SA's client id in the Admin console.
 * - **As itself** (`subject` omitted) — the SA is just another account, and
 *   reaches only what has been shared with its own email address.
 *   `utils/googleCalendar` uses this: the loan calendar is shared with the SA
 *   the way you'd share it with a colleague, so no domain-wide grant — and no
 *   trip to the Admin console — is involved.
 *
 * Hand-rolled rather than via `google-auth-library`: the whole flow is one
 * signed JWT and one form POST, and the library would pull half a dozen
 * transitive deps in for it.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

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

export function requireEnv(name: string): string {
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

/**
 * Signed JWT → OAuth access token.
 *
 * @param scopes  the scopes to request
 * @param subject the person to impersonate; omit to act as the SA itself
 */
export async function getGoogleAccessToken(scopes: string[], subject?: string): Promise<string> {
  const key = loadServiceAccountKey();

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: key.client_email,
      ...(subject ? { sub: subject } : {}),
      scope: scopes.join(' '),
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
    // `unauthorized_client` on an impersonating call almost always means the
    // scopes are not authorised for this SA's client id in the Admin console.
    throw new Error(
      `Google token exchange failed (${response.status}): ${body.error_description ?? 'unknown error'}`,
    );
  }
  return body.access_token;
}
