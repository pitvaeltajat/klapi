import TopBar from './TopBar';
import CartDrawer from './CartDrawer';
import CartButton from './CartButton';
import { useDisclosure, Box } from '@chakra-ui/react';

export default function Layout(props) {
    const { children } = props;
    const { isOpen, onOpen, onClose } = useDisclosure();

    return (
        <>
            <TopBar>
                <CartButton onOpen={onOpen} />
            </TopBar>
            <CartDrawer isOpen={isOpen} onClose={onClose} />
            <Box as='main' padding={10} margin='auto'>
                {children}
            </Box>
        </>
    );
}
