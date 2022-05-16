import { Heading, Flex } from '@chakra-ui/react';
import Link from './Link';

export default function TopBar({ children }) {
    return (
        <>
            <Flex
                color='white'
                bgColor='blue.500'
                justify='space-between'
                align='center'
            >
                <Link href='/'>
                    <Heading>KLAPI</Heading>
                </Link>
                <Link href='/loan'>Varaukset</Link>
                <Link href='/admin'>Hallinta</Link>
                <Link href='/account'>Oma tili</Link>
                {children}
            </Flex>
        </>
    );
}
