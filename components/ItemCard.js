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
import { useEffect, useState } from 'react';

export default function ItemCard({ item }) {
    const dispatch = useDispatch();


    /*
    const [availabilityData, setAvailabilityData] = useState(null)
    const [isLoading, setLoading] = useState(false)

    
    useEffect(() => {
        setLoading(true)
        const startDate = dates.startDate
        const endDate = dates.endDate
        const body = {startDate, endDate, item}
        fetch('api/getAvailability', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            })

            .then(response => response.json())
            .then(data => {
                setAvailabilityData(data)
                setLoading(false)
            }) 
    }, [])
    */

    function getAvailability(item){
        const startDate = dates.startDate
        const endDate = dates.endDate

        function getReservedAmount(item){

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
            return(reservedAmount)
        }

        const amountInCart = (cartItems.find(cartItem => cartItem.id == item.id) != undefined ? cartItems.find(cartItem => cartItem.id == item.id).amount : 0)

        const availabilities = {
            name: item.name,
            id: item.id,
            reservedAmount: getReservedAmount(item),
            availableAmount: item.amount - getReservedAmount(item) - amountInCart,  
        }
        return(availabilities)
    }

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

    const cartItems = useSelector((state) => state.cart.items);
    const cart = useSelector((state) => state.cart)
    console.log(cart)
    const dates = useSelector((state) => state.dates);

    let itemDisabled = false;

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
                            {item.amount - getAvailability(item).reservedAmount}
                        </Box>
                        {getAvailability(item).availableAmount > 0
                            ? (
                                <Button
                                    onClick={() => addItemToCart(item)}
                                    h={7}
                                    w={7}
                                    alignSelf={'center'}
                                >
                                    Lisää
                                </Button>
                            ) : null}
                        {cartItems
                            .filter((cartItem) => cartItem.id === item.id)
                            .map((cartItem) => cartItem.amount)}
                    </Flex>
                </Box>
            </Box>
        </Flex>
    );
    
}
