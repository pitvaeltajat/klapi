import { Button, Box, Stack, Flex } from "@chakra-ui/react"
import NextLink from 'next/link'
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/cart.slice';

const ItemCard = ({Item}) => {
    const dispatch = useDispatch()

    const cart = useSelector(state => state.cart)
    const dates = useSelector(state => state.dates)
    console.log(Item)

    if(Item.reservations != undefined){
        const effectiveReservations = Item.reservations.filter(
            reservation => dates.startDate < reservation.startDate && reservation.startDate < dates.endDate || dates.startDate < reservation.endDate && reservation.endDate < dates.endDate)
        var reservedAmount = 0
        effectiveReservations.map((reservation) => 
            reservedAmount += reservation.amount)    
    }
    
    const availableAmount = Item.amount-reservedAmount
    
    if(availableAmount >= 1){
        return(
            <Box borderWidth='4px' borderRadius='10px' backgroundColor='gray.400' width='200px' padding='8px'>
                <Box padding='4px'> <h2>{Item.name}</h2> </Box>
                <Flex direction='row' alignContent='center'>
                    <Button colorScheme='blue' onClick={() => dispatch(addToCart(Item))}>Lisää koriin</Button>
                    <Box verticalAlign='center' p='2' borderRadius='full' backgroundColor='blue.500'>{cart.filter((item) => item.id === Item.id).map((item) => (item.quantity))}</Box>
                </Flex>
                <Box>Varattavissa: {availableAmount}</Box>
            </Box>
            )
    }else{
        return(
            <Box borderWidth='4px' borderRadius='10px' backgroundColor='gray.400' width='200px' padding='8px'>
                <Box padding='4px'> <h2>{Item.name}</h2> </Box>
                <Box>Tätä tuotetta ei ole varattavissa valitsemallasi ajanjaksolla</Box>
            </Box>
        ) 
    }
    
}

export default ItemCard