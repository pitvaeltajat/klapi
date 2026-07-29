'use client';

import React from 'react';
import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import RedirectUnauthorized from '@/components/RedirectUnauthorized';
import { CartProvider } from '@/contexts/CartContext';
import { DatesProvider } from '@/contexts/DatesContext';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Throws on a non-2xx response instead of handing the error body back as data.
 * Without this every consumer received `{ message: '...' }` where it expected
 * its payload — `/admin` crashed with "users is not iterable" for a non-admin,
 * because the 403 body sailed through as the user list. `onError` below already
 * assumed this contract: it reads `error.status`.
 */
const fetcher = async (...args: Parameters<typeof fetch>) => {
  const res = await fetch(...args);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const error = Object.assign(new Error(body?.message || `Pyyntö epäonnistui (${res.status})`), {
      status: res.status,
      info: body,
    });
    throw error;
  }
  return body;
};

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <RedirectUnauthorized>
        <SWRConfig
          value={{
            fetcher,
            onError: (error) => {
              // 401 is what `deny()` in utils/apiAuth.ts returns for both "log
              // in" and "not allowed", so it belongs in this list too: the page
              // already renders NotAuthenticated, and a toast on top of it just
              // says the same thing twice.
              if (![401, 403, 404].includes(error.status)) {
                toast.error('Error', { description: error.message });
              }
            },
          }}
        >
          <DatesProvider>
            <CartProvider>
              <TooltipProvider>
                <Layout>{children}</Layout>
                <Toaster />
              </TooltipProvider>
            </CartProvider>
          </DatesProvider>
        </SWRConfig>
      </RedirectUnauthorized>
    </SessionProvider>
  );
}
