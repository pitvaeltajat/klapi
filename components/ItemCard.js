import {
    Flex,
    Box,
    Image,
    useColorModeValue,
    Button,
    useToast,
} from '@chakra-ui/react';

import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/cart.slice';
import useSWR from 'swr';

export default function ItemCard({ item }) {
    const dispatch = useDispatch();

    const toast = useToast();
    const addItemToCart = (item) => {
        dispatch(addToCart(item));
        toast({
            title: 'Lisättiin kama',
            description: `${item.name} lisätty ostoskoriin`,
            status: 'success',
            duration: 5000,
            isClosable: true,
        });
    };

    const items = useSelector((state) => state.cart.items);
    const dates = useSelector((state) => state.dates);

    /*
    if (item.reservations != undefined) {
        const effectiveReservations = item.reservations.filter(
            (reservation) =>
                !(
                    reservation.loan.startTime > dates.endDate ||
                    reservation.loan.endTime < dates.startDate
                )
        );
        var reservedAmount = 0;
        effectiveReservations.map(
            (reservation) => (reservedAmount += reservation.amount)
        );
    }
    */

    let availableAmount = fetch('api/getAvailability', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
    })
    console.log(availableAmount)

    let itemDisabled = true;

    if (
        availableAmount -
            items
                .filter((filterItem) => filterItem.id === item.id)
                .map((item) => item.amount) <=
        0
    ) {
        itemDisabled = true;
    } else {
        itemDisabled = false;
    }

    return (
        <Flex w='full' alignItems='center' justifyContent='center'>
            <Box
                bg={useColorModeValue('white', 'gray.800')}
                maxW='sm'
                borderWidth='1px'
                rounded='lg'
                shadow='lg'
                position='relative'
            >
                <Image
                    src={item.imgURL}
                    alt={`Picture of ${item.name}`}
                    roundedTop='lg'
                    objectFit='cover'
                    objectPosition='center'
                    w='full'
                    h='full'
                    fallbackSrc='https://via.placeholder.com/300'
                />

                <Box p='6' bgColor={itemDisabled && 'gray.300'}>
                    <Flex
                        mt='1'
                        justifyContent='space-between'
                        alignContent='center'
                    >
                        <Box
                            fontSize='2xl'
                            fontWeight='semibold'
                            as='h4'
                            lineHeight='tight'
                            isTruncated
                        >
                            {item.name}
                            {availableAmount}
                        </Box>
                        {!itemDisabled ? (
                            <Button
                                onClick={() => addItemToCart(item)}
                                h={7}
                                w={7}
                                alignSelf={'center'}
                            >
                                Lisää
                            </Button>
                        ) : null}
                        {items
                            .filter((cartItem) => cartItem.id === item.id)
                            .map((cartItem) => cartItem.amount)}
                    </Flex>
                </Box>
            </Box>
        </Flex>
    );
}
