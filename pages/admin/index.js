import Link from '../../components/Link';
import { Button } from '@chakra-ui/react';

export default function Admin() {
    return (
        <Link href='/admin/createItem'>
            <Button>Luo uusi kama</Button>
        </Link>
    );
}
