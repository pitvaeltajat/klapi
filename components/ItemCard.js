import { Flex, Box, Image, useColorModeValue, Button } from '@chakra-ui/react';

import { FiShoppingCart } from '@chakra-ui/icons';

import { useDispatch, useSelector } from 'react-redux';

import { addToCart } from '../redux/cart.slice';

export default function ItemCard({item}) {
    const dispatch = useDispatch();

    const cart = useSelector((state) => state.cart);
    const dates = useSelector(state => state.dates)


    if(item.reservations != undefined){
        const effectiveReservations = item.reservations.filter(
            reservation => !(
                reservation.loan.startTime > dates.endDate ||
                reservation.loan.endTime < dates.startDate
        ))
        var reservedAmount = 0
        effectiveReservations.map((reservation) => 
            reservedAmount += reservation.amount)    
    }

    const availableAmount = item.amount-reservedAmount

    if(availableAmount-(cart.filter((item) => item.id === item.id).map((item) => (item.quantity))) <= 0){
        var buttonDisabled = true
    } else {buttonDisabled = false}

    if(availableAmount >= 1){
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
                            >
                                {item.name}{availableAmount}
                            </Box>

                            <Button
                                variantColor='blue'
                                onClick={() => dispatch(addToCart(item))}
                                h={7}
                                w={7}
                                alignSelf={'center'}
                            >
                                Lisää
                            </Button>
                            {cart
                                .filter((cartItem) => cartItem.id === item.id)
                                .map((cartItem) => cartItem.amount)}
                            
                        </Flex>
                    </Box>
                </Box>
            </Flex>
        );} else{
            return(
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
                        src={'https://via.placeholder.com/300'}
                        alt={`Picture of ${item.name}`}
                        roundedTop='lg'
                        objectFit='cover'
                        objectPosition='center'
                        w='full'
                        h='full'
                        fallbackSrc='https://via.placeholder.com/300'
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
                            >
                                {item.name}
                            </Box>

                            <Box
                                fontSize='2xl'
                                fontWeight='semibold'
                                as='h4'
                                lineHeight='tight'
                                isTruncated
                            >
                                Tätä tuotetta ei ole varattavissa valitsemallasi ajanjaksolla
                            </Box>
                        </Flex>
                    </Box>
                </Box>
            </Flex>
            )
        }
}
