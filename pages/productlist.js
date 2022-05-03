import React from 'react';
import { Select, Checkbox, Stack, List, ListItem, OrderedList, UnorderedList, Button} from '@chakra-ui/react';
import { PrismaClient } from '@prisma/client';
import { useDispatch } from 'react-redux';
import { addToCart } from '../redux/cart.slice';
import NextLink from 'next/link'

export async function getStaticProps(){
    const prisma = new PrismaClient()
    const items = await prisma.Item.findMany({include: {categories: true}, orderBy:{name: 'asc'}})
    const categories = await prisma.Category.findMany({orderBy:{name:'asc'}})

    console.log(items)
    return {props: {items, categories}}
}

async function Reload(){
    const items = await prisma.Item.findMany({})
    return {props: items}
}

export default function newReservation({items, categories}){
    
    const dispatch = useDispatch()

    return(
    <div>
        <Stack direction='column'>
            {categories.map(category=>(
                <Checkbox>{category.name}</Checkbox>
            ))}
        </Stack>

        <UnorderedList>
            {items.map(item=>(
                <ListItem key={item.id}>{item.name} <Button onClick={() => dispatch(addToCart(item))}>Lisää koriin</Button></ListItem>
            ))}
        </UnorderedList>

        <NextLink href='/cart'>
            <Button colorScheme='blue'>Ostoskoriin</Button>
        </NextLink>

    </div>
    )

}