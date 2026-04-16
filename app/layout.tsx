import '@/styles/globals.css';
import { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = { title: 'Klapi' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
