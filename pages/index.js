import React from 'react';
import prisma from '/utils/prisma';
import DateSelector from '../components/DateSelector';
import { Box, Heading, Input, InputGroup, InputRightElement } from '@chakra-ui/react';
import { Search2Icon } from '@chakra-ui/icons';
import AllItems from './productlist';
import { useSelector } from 'react-redux';

export async function getServerSideProps() {
    const items = await prisma.Item.findMany({
        include: {
            categories: true,
            reservations: { include: { loan: true } },
        },
        orderBy: { name: 'asc' },
    });
    const categories = await prisma.Category.findMany({
        orderBy: { name: 'asc' },
    });
    return { props: { items, categories } };
}

export default function Index({ items, categories }) {
    const datesSet = useSelector((state) => state.dates.datesSet);

    const [search, setSearch] = React.useState('');
    const handleChange = (e) => {
        setSearch(e.target.value);
    };

    const filteredItems = items.filter((item) => {
        return item.name.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <>
            {datesSet ? (
                <>
                    <DateSelector />
                    <Box padding='4px'>
                        <InputGroup width={'fit-content'}>
                            <Input placeholder='Hae kamoja' marginBottom={'1em'} value={search} onChange={handleChange} />
                            <InputRightElement>
                                <Search2Icon />
                            </InputRightElement>
                        </InputGroup>
                    </Box>
                    {filteredItems.length > 0 ? (
                        <AllItems items={filteredItems} categories={categories} />
                    ) : (
                        <Heading textAlign='center' marginTop='1em'>
                            Ei hakutuloksia :(
                        </Heading>
                    )}
                </>
            ) : (
                <DateSelector />
            )}
        </>
    );
}
