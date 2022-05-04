import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import {
    ChakraProvider,
    Container,
    Box,
    Link,
    Heading,
    useDisclosure,
    Button,
    propNames,
} from '@chakra-ui/react';
import { SWRConfig } from 'swr';
import { useToast } from '@chakra-ui/react';
import store from '../redux/store';
import { Provider } from 'react-redux';
import CartButton from '../components/CartButton';
import CartDrawer from '../components/CartDrawer';
import TopBar from '../components/TopBar';

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function App({
    Component,
    pageProps: { session, ...pageProps },
}) {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();

    return (
        <SessionProvider session={session}>
            <Provider store={store}>
                <ChakraProvider>
                    <SWRConfig
                        value={{
                            fetcher,
                            onError: (error, key) => {
                                if (
                                    error.status !== 403 &&
                                    error.status !== 404
                                ) {
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
                        <TopBar>
                            <CartButton onOpen={onOpen} />
                        </TopBar>
                        <CartDrawer isOpen={isOpen} onClose={onClose} />
                        <Container>
                            <Component {...pageProps} />
                        </Container>
                    </SWRConfig>
                </ChakraProvider>
            </Provider>
        </SessionProvider>
    );
}
