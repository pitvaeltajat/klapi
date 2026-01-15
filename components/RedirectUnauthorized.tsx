import React, { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import LoadingSpinner from './LoadingSpinner';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

interface RedirectUnauthorizedProps {
    children: ReactNode;
    router: ReturnType<typeof useRouter>;
}

const RedirectUnauthorized: React.FC<RedirectUnauthorizedProps> = ({ router, children }) => {
    const { data: session, status } = useSession();
    const isBrowser = () => typeof window !== 'undefined';
    const showLoading = useDelayedLoading(status === 'loading');

    if (status === 'unauthenticated' && isBrowser() && router.pathname !== '/login') {
        router.push({
            pathname: '/login',
            query: { from: router.asPath },
        });
    }

    if (session || router.pathname === '/login') {
        return <>{children}</>;
    }

    if (status === 'loading') {
        if (!showLoading) {
            return null;
        }
        return <LoadingSpinner />;
    }

    return null;
};

export default RedirectUnauthorized;
