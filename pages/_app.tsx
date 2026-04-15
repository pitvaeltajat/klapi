import React from 'react';
import { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';
import { ThemeProvider } from 'next-themes';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import RedirectUnauthorized from '../components/RedirectUnauthorized';
import { CartProvider } from '../contexts/CartContext';
import { DatesProvider } from '../contexts/DatesContext';
import { Toaster } from '../components/ui/sonner';
import { TooltipProvider } from '../components/ui/tooltip';
import '../styles/globals.css';

const fetcher = (...args: Parameters<typeof fetch>) => fetch(...args).then((res) => res.json());

export default function App({ Component, pageProps: { session, ...pageProps }, router }: AppProps) {
  return (
    <SessionProvider session={session}>
      <RedirectUnauthorized router={router}>
        <SWRConfig
          value={{
            fetcher,
            onError: (error) => {
              if (error.status !== 403 && error.status !== 404) {
                toast.error('Error', { description: error.message });
              }
            },
          }}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <DatesProvider>
              <CartProvider>
                <TooltipProvider>
                  <Layout>
                    <Component {...pageProps} />
                  </Layout>
                  <Toaster />
                </TooltipProvider>
              </CartProvider>
            </DatesProvider>
          </ThemeProvider>
        </SWRConfig>
      </RedirectUnauthorized>
    </SessionProvider>
  );
}
