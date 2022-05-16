import Link from 'next/link';
import { Link as ChakraLink } from '@chakra-ui/react';

function CustomLink({ href, children, ...props }) {
    return (
        <Link href={href} passHref>
            <ChakraLink {...props}>{children}</ChakraLink>
        </Link>
    );
}

export default CustomLink;
