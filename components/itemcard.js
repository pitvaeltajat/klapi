import { Button, Box } from "@chakra-ui/react"
import NextLink from 'next/link'
import { useDispatch } from 'react-redux';
import { addToCart } from '../redux/cart.slice';

const ItemCard = ({Item}) => {
    const dispatch = useDispatch()

    return(
    <Box borderWidth='4px' borderRadius='10px' backgroundColor='gray.400' width='200px' padding='8px'>
        <Box padding='4px'> <h2>{Item.name}</h2> </Box>
        <Box padding='4px'><Button colorScheme='blue' onClick={() => dispatch(addToCart(Item))}>Lisää koriin</Button></Box>     
    </Box>
    )
}

export default ItemCard