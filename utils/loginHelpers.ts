/**
 * The policy behind "Jatka Googlella", kept out of the page so it can be tested
 * without a browser.
 *
 * Google never auto-selects an account on its own: with no `prompt` it shows
 * the chooser even when exactly one account is signed in, so `hd` alone only
 * shortens the list — it does not remove the tap. The parameter that actually
 * skips it is `prompt=none`, which asks Google to complete the sign-in silently
 * and to answer with an error rather than render anything.
 *
 * So the button tries silently first and falls back to the ordinary flow when
 * Google says it needs the user. The fallback is what makes this safe: a silent
 * attempt fails for every visitor who is signed out, has never consented, or
 * has two accounts in the domain, and all of them must still be able to log in.
 */

/**
 * Set in `sessionStorage` for the duration of a silent attempt — the redirect
 * to Google and back is a full page load, so this is the only way the page can
 * still know, on the way back, which kind of attempt bounced.
 */
export const SILENT_ATTEMPT_KEY = 'klapi.google-silent-attempt';

/** Extra authorization params for the silent attempt. */
export const SILENT_AUTH_PARAMS = { prompt: 'none' } as const;

/**
 * What `/login` should do when Auth.js sends it back with `?error=`.
 *
 * A bounced *silent* attempt is the expected, uninteresting case — Google is
 * saying "I need the user", which is not something to report, so we go straight
 * back out interactively and the visitor still only ever clicked once.
 *
 * Anything else is a real failure and gets a message. Keying on "was the
 * attempt silent" rather than on the error code is what keeps this from
 * looping: the interactive retry never sets the flag, so a second failure can
 * only ever land in `show-error`.
 */
export function nextStepAfterLoginError(wasSilentAttempt: boolean): 'retry-interactive' | 'show-error' {
  return wasSilentAttempt ? 'retry-interactive' : 'show-error';
}

/**
 * Auth.js error codes, in Finnish. `OAuthCallbackError` is the one Google's own
 * refusals arrive as (including a denied consent screen); `AccessDenied` is our
 * own `signIn` callback turning away a soft-deleted account.
 */
export function loginErrorMessage(code: string | null): string {
  switch (code) {
    case 'AccessDenied':
      return 'Tunnuksellasi ei ole pääsyä Klapiin. Ota yhteyttä ylläpitoon.';
    case 'OAuthCallbackError':
    case 'OAuthAccountNotLinked':
      return 'Google-kirjautuminen epäonnistui. Yritä uudelleen.';
    case 'Configuration':
      return 'Kirjautuminen ei ole juuri nyt käytettävissä.';
    default:
      return 'Kirjautuminen epäonnistui. Yritä uudelleen.';
  }
}
