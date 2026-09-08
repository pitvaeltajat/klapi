/**
 * The local password-free sign-in is an authentication bypass, so what is
 * tested here is that it does not exist unless it is meant to — both the
 * predicate and the provider list `lib/auth.ts` actually builds from it.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { isDevLoginEnabled, DEV_LOGIN_PROVIDER_ID } from '@/utils/devLogin';

vi.mock('@/utils/prisma', () => ({
  default: { user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() } },
}));

/**
 * `Credentials()` hardcodes `id: 'credentials'` on the object it returns and
 * stashes the caller's config — custom id and `authorize` both — under
 * `options`. Auth.js resolves that at request time (`parseProviders`:
 * `userOptions?.id ?? defaults.id`), so a test reading the config directly has
 * to do the same or it sees two providers both called "credentials".
 */
interface RawProvider {
  id: string;
  options?: { id?: string; authorize?: (credentials: unknown) => Promise<unknown> };
  authorize?: (credentials: unknown) => Promise<unknown>;
}

const resolvedId = (p: RawProvider) => p.options?.id ?? p.id;

async function loadProviders(env: Record<string, string>): Promise<RawProvider[]> {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const { authConfig } = await import('@/lib/auth');
  return authConfig.providers as unknown as RawProvider[];
}

/** The provider ids `lib/auth.ts` registers under the given environment. */
async function providerIds(env: Record<string, string>): Promise<string[]> {
  return (await loadProviders(env)).map(resolvedId);
}

async function devProvider(): Promise<(credentials: unknown) => Promise<unknown>> {
  const providers = await loadProviders({
    NODE_ENV: 'development',
    ENABLE_DEV_LOGIN: 'true',
  });
  const provider = providers.find((p) => resolvedId(p) === DEV_LOGIN_PROVIDER_ID);
  if (!provider?.options?.authorize) throw new Error('dev provider not registered');
  return provider.options.authorize;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('isDevLoginEnabled', () => {
  it('needs the opt-in, not just a non-production build', () => {
    expect(isDevLoginEnabled({ NODE_ENV: 'development' })).toBe(false);
    expect(isDevLoginEnabled({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: 'true' })).toBe(true);
  });

  it('is off in production however loudly the environment asks for it', () => {
    // The guard that is not configurable: `next build`/`next start` and every
    // Vercel deployment set NODE_ENV=production, so a leaked flag is inert.
    expect(isDevLoginEnabled({ NODE_ENV: 'production', ENABLE_DEV_LOGIN: 'true' })).toBe(false);
    expect(isDevLoginEnabled({ NODE_ENV: 'production', ENABLE_DEV_LOGIN: '1' })).toBe(false);
  });

  it('only accepts the exact string "true"', () => {
    for (const value of ['1', 'yes', 'TRUE', 'true ', '']) {
      expect(isDevLoginEnabled({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: value })).toBe(false);
    }
  });

  it('is off when nothing is set at all', () => {
    expect(isDevLoginEnabled({} as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('authConfig providers', () => {
  it('leaves the dev provider out of a production build', async () => {
    const ids = await providerIds({ NODE_ENV: 'production', ENABLE_DEV_LOGIN: 'true' });
    expect(ids).not.toContain(DEV_LOGIN_PROVIDER_ID);
    // The real ones are untouched by any of this.
    expect(ids).toContain('google');
    expect(ids).toContain('credentials');
  });

  it('leaves it out of a dev server that did not ask for it', async () => {
    const ids = await providerIds({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: '' });
    expect(ids).not.toContain(DEV_LOGIN_PROVIDER_ID);
  });

  it('registers it for a dev server that did', async () => {
    const ids = await providerIds({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: 'true' });
    expect(ids).toContain(DEV_LOGIN_PROVIDER_ID);
  });
});

describe('dev provider authorize', () => {
  it('refuses even when registered, if the gate has since closed', async () => {
    const authorize = await devProvider();
    // Registration happens once at module load; minting a session is what
    // actually matters, so the gate is read again here.
    vi.stubEnv('ENABLE_DEV_LOGIN', '');
    expect(await authorize({ username: 'admin' })).toBeNull();
  });

  it('refuses an empty or non-string identifier', async () => {
    const authorize = await devProvider();
    expect(await authorize({ username: '   ' })).toBeNull();
    expect(await authorize({ username: 42 })).toBeNull();
    expect(await authorize({})).toBeNull();
  });
});
