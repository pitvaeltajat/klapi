import { useSession } from 'next-auth/react';

const RedirectUnauthorized = ({ router, children }) => {
    const { data: session, status } = useSession();
    const isBrowser = () => typeof window !== 'undefined';

    if (status == 'unauthenticated' && isBrowser() && router.pathname !== '/login') {
        router.push({
            pathname: '/login',
            query: { from: router.asPath },
        });
    }

    if (session || router.pathname == '/login') {
        return children;
    } else {
        return <>Ladataan...</>;
    }
};

export default RedirectUnauthorized;
