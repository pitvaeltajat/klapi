import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { ChakraProvider } from '@chakra-ui/react';

export default function App({
    Component,
    pageProps: { session, ...pageProps },
}) {
    return (
        <ChakraProvider>
            <SessionProvider session={session}>
                <Component {...pageProps} />
            </SessionProvider>,
        </ChakraProvider>
        
    );

}
