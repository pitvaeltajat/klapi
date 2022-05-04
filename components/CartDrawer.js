import {
    Button,
    Drawer,
    DrawerBody,
    DrawerOverlay,
    DrawerFooter,
    DrawerHeader,
    DrawerContent,
    DrawerCloseButton,
    Stack,
    Box,
    FormLabel,
    Input,
    InputGroup,
    InputLeftAddon,
    InputRightAddon,
    IconButton,
} from '@chakra-ui/react';

import { useRef } from 'react';

import { AddIcon, MinusIcon } from '@chakra-ui/icons';

import { useSelector, useDispatch } from 'react-redux';
import { incrementQuantity, decrementQuantity } from '../redux/cart.slice';

export default function CartDrawer({ isOpen, onClose }) {
    const firstField = useRef();
    const dispatch = useDispatch();
    const cart = useSelector((state) => state.cart);

    return (
        <Drawer
            isOpen={isOpen}
            placement='right'
            initialFocusRef={firstField}
            onClose={onClose}
        >
            <DrawerOverlay />
            <DrawerContent>
                <DrawerCloseButton />
                <DrawerHeader borderBottomWidth='1px'>Ostoskori</DrawerHeader>

                <DrawerBody>
                    <Stack spacing='24px'>
                        {cart.map(
                            (item) =>
                                item.amount > 0 && (
                                    <Box key={item.id}>
                                        <FormLabel htmlFor={`item-${item.id}`}>
                                            {item.name}
                                        </FormLabel>
                                        <InputGroup>
                                            <InputLeftAddon>
                                                <IconButton
                                                    icon={<MinusIcon />}
                                                    aria-label='decrement'
                                                    onClick={() =>
                                                        dispatch(
                                                            decrementQuantity(
                                                                item.id
                                                            )
                                                        )
                                                    }
                                                />
                                            </InputLeftAddon>
                                            <Input
                                                id={`item-${item.id}`}
                                                value={item.amount}
                                            />
                                            <InputRightAddon>
                                                <IconButton
                                                    icon={<AddIcon />}
                                                    aria-label='increment'
                                                    onClick={() =>
                                                        dispatch(
                                                            incrementQuantity(
                                                                item.id
                                                            )
                                                        )
                                                    }
                                                />
                                            </InputRightAddon>
                                        </InputGroup>
                                    </Box>
                                )
                        )}
                    </Stack>
                </DrawerBody>

                <DrawerFooter borderTopWidth='1px'>
                    <Button variant='outline' mr={3} onClick={onClose}>
                        Sulje
                    </Button>
                    <Button colorScheme='blue'>Varaa</Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
