import { Heading, Flex, Box } from '@chakra-ui/react';
import Link from './Link';

export default function TopBar({ children }) {
    return (
        <>
            <Flex
                color='white'
                bgColor='blue.500'
                justify='space-between'
                align='center'
                position='fixed'
                top='0'
                width='100%'
                zIndex='9999'
            >   
                <Box
                    marginInlineStart='2em'
                >
                    <Link href='/'>
                        <Heading>KLAPI</Heading>
                    </Link>
                </Box>          
                <Link href='/loan'>Varaukset</Link>
                <Link href='/admin'>Hallinta</Link>
                <Link href='/account'>Oma tili</Link>

                <Box
                    marginInlineEnd='2em'
                >
                    {children}
                </Box>
                
            </Flex>
        </>
    );
}
