import { describe, it, expect } from 'vitest';
import {
  SILENT_AUTH_PARAMS,
  loginErrorMessage,
  nextStepAfterLoginError,
} from '@/utils/loginHelpers';

describe('silent Google sign-in', () => {
  // `hd` alone does not skip Google's chooser — it renders even for a single
  // matching account, which is how this was found. `prompt=none` is the only
  // parameter that asks Google to finish without showing anything.
  it('asks Google not to render anything', () => {
    expect(SILENT_AUTH_PARAMS.prompt).toBe('none');
  });

  it('turns a bounced silent attempt straight back into an ordinary sign-in', () => {
    expect(nextStepAfterLoginError(true)).toBe('retry-interactive');
  });

  it('reports a failure that was not a silent attempt', () => {
    expect(nextStepAfterLoginError(false)).toBe('show-error');
  });

  // The loop guard. Only the silent attempt sets the flag, so the interactive
  // retry that follows can only ever land in 'show-error' — two round trips to
  // Google is the ceiling, however Google answers.
  it('cannot retry twice, because the retry never marks itself silent', () => {
    const afterSilent = nextStepAfterLoginError(true);
    expect(afterSilent).toBe('retry-interactive');
    // The retry runs without marking, so its own failure reads as not-silent.
    expect(nextStepAfterLoginError(false)).toBe('show-error');
  });
});

describe('loginErrorMessage', () => {
  it('names the one failure the reader cannot fix by retrying', () => {
    expect(loginErrorMessage('AccessDenied')).toContain('ylläpitoon');
  });

  it('is in Finnish for every code, known or not', () => {
    for (const code of ['OAuthCallbackError', 'Configuration', 'Verification', null]) {
      expect(loginErrorMessage(code)).toMatch(/[a-zäö]/i);
      expect(loginErrorMessage(code)).not.toMatch(/error|failed/i);
    }
  });
});
