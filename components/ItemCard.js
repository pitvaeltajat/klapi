import {
    Flex,
    Box,
    Image,
    useColorModeValue,
    Icon,
    chakra,
    Tooltip,
} from '@chakra-ui/react';

import { FiShoppingCart } from 'react-icons/fi';

export default function ItemCard({ item }) {
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
                    src={item.imageURL}
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
                        <Tooltip
                            label='Add to cart'
                            bg='white'
                            placement={'top'}
                            color={'gray.800'}
                            fontSize={'1.2em'}
                        >
                            <chakra.a href={'#'} display={'flex'}>
                                <Icon
                                    as={FiShoppingCart}
                                    h={7}
                                    w={7}
                                    alignSelf={'center'}
                                />
                            </chakra.a>
                        </Tooltip>
                    </Flex>
                </Box>
            </Box>
        </Flex>
    );
}
