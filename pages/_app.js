import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { ChakraProvider } from '@chakra-ui/react';
import { SWRConfig } from 'swr';
import { useToast } from '@chakra-ui/react';

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function App({
    Component,
    pageProps: { session, ...pageProps },
}) {
    const toast = useToast();

    return (
        <ChakraProvider>
            <SessionProvider session={session}>
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
                    <Component {...pageProps} />
                </SWRConfig>
            </SessionProvider>
        </ChakraProvider>
    );
}
