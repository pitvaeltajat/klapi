import '@/styles/globals.css';
import { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Providers from './providers';

export const metadata: Metadata = { title: 'Klapi' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve the session on the server so SessionProvider hydrates with it
  // immediately: useSession() never flashes 'loading', RedirectUnauthorized
  // stops gating SSR behind a client `/api/auth/session` round-trip, and
  // authenticated pages render real HTML in the first response (faster FCP).
  // JWT strategy means this is a cookie decode, not a DB hit.
  const session = await getServerSession(authOptions);
  return (
    <html lang="fi" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers session={session}>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
