import { SessionProvider, useSession } from 'next-auth/react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { SWRConfig } from 'swr';
import { useToast } from '@chakra-ui/react';
import store from '../redux/store';
import { Provider } from 'react-redux';
import Layout from '../components/Layout';
import useRouter from 'next/router';
import RedirectUnauthorized from '../components/RedirectUnauthorized';
import theme from '../styles/theme';

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function App({
    Component,
    pageProps: { session, ...pageProps },
    router,
}) {
    const toast = useToast();
    const getLayout = Component.getLayout || ((page) => page);

    return (
        <SessionProvider session={session}>
            <RedirectUnauthorized router={router}>
                <SWRConfig
                    value={{
                        fetcher,
                        onError: (error, key) => {
                            if (error.status !== 403 && error.status !== 404) {
                                toast({
                                    title: 'Error',
                                    description: error.message,
                                    status: 'error',
                                    duration: 5000,
                                    isClosable: true,
                                });
                            }
                        },
                    }}
                >
                    <Provider store={store}>
                        <ChakraProvider theme={theme}>
                            {/* TODO: for some reason the theme is not applied to the layout */}
                            <Layout>
                                <Component {...pageProps} />
                            </Layout>
                        </ChakraProvider>
                    </Provider>
                </SWRConfig>
            </RedirectUnauthorized>
        </SessionProvider>
    );
}
