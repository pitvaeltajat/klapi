import '@/styles/globals.css';
import { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { auth } from '@/lib/auth';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Klapi',
  // The UI is Finnish; on a kiosk whose browser language isn't Finnish, Chrome
  // otherwise offers to translate the page on every load.
  other: { google: 'notranslate' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve the session on the server so SessionProvider hydrates with it
  // immediately: useSession() never flashes 'loading', RedirectUnauthorized
  // stops gating SSR behind a client `/api/auth/session` round-trip, and
  // authenticated pages render real HTML in the first response (faster FCP).
  // JWT strategy means this is a cookie decode, not a DB hit.
  const session = await auth();
  return (
    <html lang="fi" translate="no" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers session={session}>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
