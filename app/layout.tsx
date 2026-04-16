import '@/styles/globals.css';
import { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import Providers from './providers';

export const metadata: Metadata = { title: 'Klapi' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
