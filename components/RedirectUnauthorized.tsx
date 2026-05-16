'use client';

import React, { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import PageSkeleton from './PageSkeleton';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

interface RedirectUnauthorizedProps {
  children: ReactNode;
}

const RedirectUnauthorized: React.FC<RedirectUnauthorizedProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isBrowser = () => typeof window !== 'undefined';
  const showLoading = useDelayedLoading(status === 'loading');

  if (status === 'unauthenticated' && isBrowser() && pathname !== '/login') {
    router.push(`/login?from=${encodeURIComponent(pathname)}`);
  }

  if (session || pathname === '/login') {
    return <>{children}</>;
  }

  if (status === 'loading') {
    if (!showLoading) {
      return null;
    }
    return <PageSkeleton />;
  }

  return null;
};

export default RedirectUnauthorized;
