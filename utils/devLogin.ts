/**
 * The password-free sign-in used while developing locally: pick an account,
 * you are it. It exists so anyone driving the UI — a person clicking through a
 * change, or an agent that is not allowed to type passwords into forms — can
 * get to a signed-in page without the seeded credentials.
 *
 * It is a real authentication bypass, so it is behind **two** conditions and
 * both must hold:
 *
 * 1. `NODE_ENV !== 'production'`. This is the structural one and it is not
 *    configurable: `next build`, `next start` and every Vercel deployment set
 *    NODE_ENV to production, so the provider cannot be registered in a deployed
 *    app no matter what the environment says. Only `next dev` and the test
 *    runner are ever anything else.
 * 2. `ENABLE_DEV_LOGIN=true`, an explicit opt-in. `next dev` binds to every
 *    interface and prints a LAN URL, so a dev server is reachable by anyone on
 *    the same network — that is enough reason not to have this on merely
 *    because someone started one.
 *
 * Checked at module load, where the provider list is built, and again inside
 * `authorize` — so a provider that somehow survived into the wrong environment
 * still refuses to mint a session.
 */
export function isDevLoginEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== 'production' && env.ENABLE_DEV_LOGIN === 'true';
}

/** Auth.js provider id. Distinct from `credentials`, which stays password-checked. */
export const DEV_LOGIN_PROVIDER_ID = 'dev-login';

/**
 * The seeded accounts offered as one-click buttons, one per role — see
 * `prisma/seed.ts`. Any other account is reachable by typing its username or
 * email into the field beside them, so this is a shortcut, not a limit.
 */
export const DEV_LOGIN_ACCOUNTS = [
  { username: 'admin', label: 'Ylläpitäjä' },
  { username: 'pitva', label: 'Kioski' },
  { username: 'matti.virtanen', label: 'Jäsen' },
] as const;
