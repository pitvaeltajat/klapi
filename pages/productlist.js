import React from 'react';
import { Select, Checkbox, Stack, List, ListItem, OrderedList, UnorderedList, Button} from '@chakra-ui/react';
import { PrismaClient } from '@prisma/client';
import NextLink from 'next/link'
import ItemCard from '../components/itemcard';
import { useSelector } from 'react-redux';

export async function getStaticProps(){
    const prisma = new PrismaClient()
    const items = await prisma.Item.findMany({include: {categories: true, reservations: true}, orderBy:{name: 'asc'}})
    const categories = await prisma.Category.findMany({orderBy:{name:'asc'}})

    console.log(items)
    return {props: {items, categories}}
}

export default function AllItems({items, categories}){

    const dates = useSelector((state) => state.dates)

    return(
    <div>
        <h1>Kaikki kamat</h1>
        <Stack direction='row' padding='4px'>
            {categories.map(category=>(
                <NextLink href={`/category/${category.name}`}>
                    <Button>{category.name}</Button>
                </NextLink>
            ))}
        </Stack>
                
        <h2>Päivämäärät:</h2>
        <p>{dates.startDate.toLocaleString('fi', {
            day: 'numeric',
            year: 'numeric',
            month: 'long',
            hour: 'numeric',
            minute: '2-digit'
        })}</p>
        <p>{dates.endDate.toLocaleString('fi', {
            day: 'numeric',
            year: 'numeric',
            month: 'long',
            hour: 'numeric',
            minute: '2-digit'
        })}</p>



        {items.map(item=>(
            <ItemCard key={item.id} Item={item}/>
        ))}

        <NextLink href='/cart'>
            <Button colorScheme='blue'>Ostoskoriin</Button>
        </NextLink>

    </div>
    )

}