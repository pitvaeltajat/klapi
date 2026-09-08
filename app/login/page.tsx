import { Suspense } from 'react';
import { isDevLoginEnabled } from '@/utils/devLogin';
import LoginContent, { LoginSkeleton } from './LoginContent';

/**
 * A server component purely so the dev-login panel is decided here rather than
 * from a `NEXT_PUBLIC_` twin of the flag: `isDevLoginEnabled()` stays the one
 * source of truth, and a production bundle simply never carries the panel.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent devLoginEnabled={isDevLoginEnabled()} />
    </Suspense>
  );
}
