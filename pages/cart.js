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
    IconButton,
    Input,
    Box
  } from '@chakra-ui/react'
import NextLink from 'next/link'
import { AddIcon, MinusIcon } from "@chakra-ui/icons"
import DatePicker from 'react-datepicker'
import { useState } from "react"
import "react-datepicker/dist/react-datepicker.css"
import { useSession } from "next-auth/react"
import { PrismaClient } from "@prisma/client"

export default function CartPage(){
    
    const cart = useSelector((state) => state.cart)
    const dates = useSelector((state) => state.dates)
    const dispatch = useDispatch()
     
    const {data: session, status} = useSession()

    const startTime = dates.startDate
    const endTime = dates.endDate

    const userName = session.user.name

    const reservations = cart.map((cartitem) => ({
        item: {connect: {id: cartitem.id}},
        amount: cartitem.quantity,
    }))

    async function submitLoan(){
        const body = {reservations, startTime, endTime, userName}
        console.log(body)
        await fetch('api/submitLoan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
    }

    return(
        <div>
            <NextLink href='/productlist'>
                <Button>Takaisin listaan</Button>
            </NextLink>

            <TableContainer>
                <Table>
                    <Thead>
                        <Tr>
                            <Th>Kama</Th>
                            <Th>Määrä</Th>
                            <Th>Muokkaa</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {cart.map((item) => (
                            <Tr>
                                <Td>{item.name}</Td>
                                <Td>{item.quantity}</Td>
                                <Td>
                                    <IconButton icon={<MinusIcon />} onClick={() => dispatch(decrementQuantity(item.id))}></IconButton>
                                    <IconButton icon={<AddIcon />} onClick={() => dispatch(incrementQuantity(item.id))}></IconButton>
                                </Td>
                            </Tr>
                            ))}
                    </Tbody>
                </Table>
            </TableContainer>

            <Box>
                <Button onClick={()=>submitLoan()}>Lähetä varaus</Button>
            </Box> 
            
        </div>    
   
    ) 
}

/*
<h2>Aloitus</h2>
            <Box padding={'4px'}>
                <DatePicker selected={startDate} onChange={(date) => setStartDate(date)}/>
            </Box>

            <h2>Lopetus</h2>
            <Box padding={'4px'}>
                <DatePicker selected={endDate} onChange={(date) => setEndDate(date)}/>
            </Box>
           
*/
