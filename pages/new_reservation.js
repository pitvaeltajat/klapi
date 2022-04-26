import React from 'react';
import { Select } from '@chakra-ui/react';
import { PrismaClient } from '@prisma/client';

export async function getStaticProps(){
    const prisma = new PrismaClient()
    const itemquery = await prisma.Item.findMany({})
    
    console.log(itemquery)
    return {props: {itemquery}}
}

export default function newReservation({itemquery}){
    return(
    <div>
        Hello World!
        <Select placeholder='Valitse kategoria' isRequired={true}>
            {itemquery.name}
        </Select> 

        <Select placeholder='Valitse tavara' isRequired={true}></Select> 

        <p>{itemquery.name}</p>

    </div>
    )

}