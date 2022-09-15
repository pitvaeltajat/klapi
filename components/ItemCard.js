import {
    Flex,
    Box,
    Image,
    useColorModeValue,
    Button,
    useToast,
    Circle,
} from '@chakra-ui/react';

import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/cart.slice';

export default function ItemCard({ item }) {
    const dispatch = useDispatch();

    function getAvailability(item) {
        const startDate = dates.startDate;
        const endDate = dates.endDate;

        function getReservedAmount(item) {
            if (item.reservations != undefined) {
                const effectiveReservations = item.reservations.filter(
                    (reservation) =>
                        !(
                            reservation.loan.startTime > endDate ||
                            reservation.loan.endTime < startDate
                        )
                        &&
                        reservation.loan.status !== 'REJECTED'
                        &&
                        reservation.loan.status !== 'RETURNED'
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

    const toast = useToast();
    const addItemToCart = (item) => {
        dispatch(addToCart(item));
        toast({
            title: 'Lisättiin kama',
            description: `${item.name} lisätty ostoskoriin`,
            status: 'success',
            duration: 1500,
            isClosable: true,
        });
    };

    const cartItems = useSelector((state) => state.cart.items);
    const cart = useSelector((state) => state.cart);
    const dates = useSelector((state) => state.dates);

    return (
        <Box w='full' alignItems='center' justifyContent='center'>
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
                    fallbackSrc='https://via.placeholder.com/500x300'
                />

                <Box p='6'>
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
                            overflow='hidden'
                            noOfLines='1'
                            title={item.name}
                        >
                            {item.name}
                        </Box>
                        
                    </Flex>
                    <Box>
                        <Button
                            onClick={() => addItemToCart(item)}
                            size='sm'
                            alignSelf={'center'}
                            colorScheme='blue'
                            isDisabled={
                                getAvailability(item).availableAmount <= 0
                            }
                        >
                            Lisää koriin
                            <Circle
                                position='absolute'
                                right='-7px'
                                top='-7px'   
                                size='20px'
                                bg='red'
                                color='white'
                                display={cartItems
                                            .filter((cartItem) => cartItem.id === item.id)
                                            .map((cartItem) => cartItem.amount)
                                            >0 ? 'block' : 'none'}
                                        
                            >
                                {cartItems
                                .filter((cartItem) => cartItem.id === item.id)
                                .map((cartItem) => cartItem.amount)}
                            </Circle>
                        </Button>
                    </Box>
                    <Box
                        fontSize='medium'
                        fontWeight='semibold'
                        as='h4'
                        lineHeight='tight'
                        isTruncated
                    >
                        Saatavilla:{' '}
                        {getAvailability(item).availableAmount}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
