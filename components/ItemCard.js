import {
    Flex,
    Box,
    Image,
    useColorModeValue,
    IconButton,
} from '@chakra-ui/react';

import { FiShoppingCart } from '@chakra-ui/icons';

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

                        <IconButton
                            icon={FiShoppingCart}
                            variant='transparent'
                            onClick={() => {
                                alert('Added to cart!');
                            }}
                            h={7}
                            w={7}
                            alignSelf={'center'}
                        />
                    </Flex>
                </Box>
            </Box>
        </Flex>
    );
}
