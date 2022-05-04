import { useSelector, useDispatch } from "react-redux"
import { incrementQuantity, decrementQuantity} from "../redux/cart.slice"
import {
    Table,
    Thead,
    Tbody,
    Tfoot,
    Tr,
    Th,
    Td,
    TableCaption,
    TableContainer,
    Button,
    IconButton
  } from '@chakra-ui/react'
import NextLink from 'next/link'
import { AddIcon, MinusIcon } from "@chakra-ui/icons"

const CartPage = () => {
    const cart = useSelector((state) => state.cart)

    const dispatch = useDispatch()
    
    return(
        <div>
            <TableContainer>
                <Table>
                    <Thead>
                        <Tr>
                            <Th>Kama</Th>
                            <Th>Määrä</Th>
                            <Th>Sijainti</Th>
                            <Th>Muokkaa</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {cart.map((item) => (
                            <Tr>
                                <Td>{item.name}</Td>
                                <Td>{item.quantity}</Td>
                                <Td>*Sijainti*</Td>
                                <Td>
                                    <IconButton icon={<MinusIcon />} onClick={() => dispatch(decrementQuantity(item.id))}></IconButton>
                                    <IconButton icon={<AddIcon />} onClick={() => dispatch(incrementQuantity(item.id))}></IconButton>
                                </Td>
                            </Tr>
                            ))}
                    </Tbody>
                </Table>
            </TableContainer>

            <NextLink href='/productlist'>
                <Button>Takaisin listaan</Button>
            </NextLink>
            
        </div>    
   
    ) 
}

export default CartPage