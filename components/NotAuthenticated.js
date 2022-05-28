import { Heading, Button } from '@chakra-ui/react';
import Link from '../components/Link';

export default function NotAuthenticated() {
    return (
        <>
            <Heading>Ei käyttöoikeutta</Heading>
            <Link href='/'>
                <Button>Palaa etusivulle</Button>
            </Link>
        </>
    );
}
