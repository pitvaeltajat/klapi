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
import { incrementAmount, decrementAmount } from '../redux/cart.slice';
import { useSession } from 'next-auth/react';

export default function CartDrawer({ isOpen, onClose }) {
    const firstField = useRef();
    const dispatch = useDispatch();
    const cart = useSelector((state) => state.cart);
    const dates = useSelector((state) => state.dates);

    const { data: session, status } = useSession();

    const startTime = dates.startDate;
    const endTime = dates.endDate;

    const userName = session?.user?.name;

    const reservations = cart.items.map((cartitem) => ({
        item: { connect: { id: cartitem.id } },
        amount: cartitem.amount,
    }));

    const description = cart.description;

    async function submitLoan() {
        const body = {
            reservations,
            startTime,
            endTime,
            userName,
            description,
        };
        await fetch('api/submitLoan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    }

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
                        {cart.items.map(
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
                                                            decrementAmount(
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
                                                            incrementAmount(
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
                    <Button colorScheme='blue' onClick={() => submitLoan()}>
                        Varaa
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
