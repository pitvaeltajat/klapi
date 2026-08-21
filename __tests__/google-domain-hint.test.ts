import { describe, it, expect, vi, afterEach } from 'vitest';
import type { OAuthConfig } from '@auth/core/providers/oauth';

// lib/auth pulls in the Prisma singleton for the credentials provider and the
// callbacks. None of that is exercised here, so a stub keeps this file
// database-free.
vi.mock('@/utils/prisma', () => ({
  default: { user: { findUnique: vi.fn(), findMany: vi.fn() } },
}));

/**
 * Re-import lib/auth with a given GOOGLE_WORKSPACE_DOMAIN. The provider config
 * is built at module load, so the env has to be in place before the import —
 * hence resetModules rather than a plain top-level import.
 */
async function googleAuthParams(domain: string | undefined) {
  vi.resetModules();
  if (domain === undefined) delete process.env.GOOGLE_WORKSPACE_DOMAIN;
  else process.env.GOOGLE_WORKSPACE_DOMAIN = domain;

  const { authConfig } = await import('@/lib/auth');
  const google = authConfig.providers.find(
    (p) => 'id' in p && p.id === 'google',
  ) as OAuthConfig<unknown> & { options?: OAuthConfig<unknown> };
  // Provider factories stash the caller's options under `options`; next-auth
  // merges them over the defaults at request time.
  const authorization = google.options?.authorization;
  return typeof authorization === 'string' ? undefined : authorization?.params;
}

const savedDomain = process.env.GOOGLE_WORKSPACE_DOMAIN;
afterEach(() => {
  if (savedDomain === undefined) delete process.env.GOOGLE_WORKSPACE_DOMAIN;
  else process.env.GOOGLE_WORKSPACE_DOMAIN = savedDomain;
});

describe('Google sign-in hosted-domain hint', () => {
  it('sends hd so the troop account is picked without a chooser', async () => {
    const params = await googleAuthParams('pitva.test');
    expect(params?.hd).toBe('pitva.test');
    // `prompt=select_account` overrides `login_hint`/`hd` and would put the
    // chooser back on every sign-in, undoing the whole point of the hint.
    expect(params?.prompt).toBeUndefined();
  });

  it('sends no hint at all when the domain is unset', async () => {
    expect(await googleAuthParams(undefined)).toBeUndefined();
  });

  it('ignores a blank domain rather than sending hd=', async () => {
    expect(await googleAuthParams('   ')).toBeUndefined();
  });
});
