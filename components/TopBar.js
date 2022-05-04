import { Box, Link, Heading, Flex } from '@chakra-ui/react';

export default function TopBar({ children }) {
    return (
        <>
            <Flex bgColor='blue.500' justify='space-between' align='cent'>
                <Link href='/'>
                    <Heading>KLAPI</Heading>
                </Link>
                {children}
            </Flex>
        </>
    );
}
