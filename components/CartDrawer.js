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
    Heading,
    useDisclosure,
} from '@chakra-ui/react';
import { useRef } from 'react';
import { AddIcon, MinusIcon } from '@chakra-ui/icons';
import { useSelector, useDispatch } from 'react-redux';
import { incrementAmount, decrementAmount } from '../redux/cart.slice';
import { useSession } from 'next-auth/react';
import { setDescription } from '../redux/cart.slice';
import useSWR from 'swr';
import SubmitConfirmation from './SubmitConfirmation';

export default function CartDrawer({ isOpen, onClose }) {
    const firstField = useRef();
    const dispatch = useDispatch();
    const cart = useSelector((state) => state.cart);
    const dates = useSelector((state) => state.dates);

    const ConfirmationDialog = useDisclosure();

    const startTime = dates.startDate;
    const endTime = dates.endDate;

    const description = cart.description;

    const { data: items, error: itemsError } = useSWR('/api/item/getItems');

    function getAvailability(cartItem) {
        const startDate = dates.startDate;
        const endDate = dates.endDate;
        const item = items.find((item) => item.id == cartItem.id);
        const cartItems = cart.items;

        function getReservedAmount(item) {
            if (item.reservations != undefined) {
                const effectiveReservations = item.reservations.filter(
                    (reservation) =>
                        !(
                            reservation.loan.startTime > endDate ||
                            reservation.loan.endTime < startDate
                        )
                );
                var reservedAmount = 0;
                effectiveReservations.map(
                    (reservation) => (reservedAmount += reservation.amount)
                );
            }
            return reservedAmount;
        }

        const amountInCart =
            cartItems.find((cartItem) => cartItem.id == item.id) != undefined
                ? cartItems.find((cartItem) => cartItem.id == item.id).amount
                : 0;

        const availabilities = {
            name: item.name,
            id: item.id,
            reservedAmount: getReservedAmount(item),
            availableAmount:
                item.amount - getReservedAmount(item) - amountInCart,
        };
        return availabilities;
    }

    return (
        <Drawer
            isOpen={isOpen}
            placement='right'
            size='full'
            initialFocusRef={firstField}
            onClose={onClose}
        >
            <DrawerOverlay />
            <DrawerContent height='100%'>
                <DrawerCloseButton />
                <DrawerHeader borderBottomWidth='1px'>Ostoskori</DrawerHeader>

                <DrawerBody>
                    <SubmitConfirmation
                        isOpen={ConfirmationDialog.isOpen}
                        onClose={ConfirmationDialog.onClose}
                    />
                    <Stack spacing={4}>
                        <Box>
                            <FormLabel htmlFor='description'>Kuvaus</FormLabel>
                            <Input
                                ref={firstField}
                                id='description'
                                name='description'
                                placeholder='Kuvaus'
                                value={description}
                                onChange={(e) => {
                                    dispatch(setDescription(e.target.value));
                                }}
                            />
                        </Box>
                        <Box>
                            <FormLabel htmlFor='startTime'>Alku</FormLabel>
                            <Input id='startTime' value={startTime} readOnly />
                        </Box>
                        <Box>
                            <FormLabel htmlFor='endTime'>Loppu</FormLabel>
                            <Input id='endTime' value={endTime} readOnly />
                        </Box>
                    </Stack>
                    
                    {cart.items.length > 0 ?
                    <Stack spacing='24px'>
                        
                        <Heading as='h3' size='md'>
                            Valitut kamat
                        </Heading>
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
                                                    isDisabled={
                                                        getAvailability(item)
                                                            .availableAmount <=
                                                        0
                                                    }
                                                />
                                            </InputRightAddon>
                                        </InputGroup>
                                    </Box>
                                )
                        )}
                    </Stack>
                    : <Heading as='h3' size='md'>Ostoskori on tyhjä</Heading>}
                </DrawerBody>

                <DrawerFooter borderTopWidth='1px'>
                    <Button variant='outline' mr={3} onClick={onClose}>
                        Sulje
                    </Button>
                    <Button
                        colorScheme='blue'
                        onClick={ConfirmationDialog.onOpen}
                        isDisabled={cart.items.length==0}
                    >
                        Varaa
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
