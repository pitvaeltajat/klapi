import NextLink from 'next/link';
import { Button, Heading, Link } from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../components/NotAuthenticated';

export default function Admin() {
	const { data: session } = useSession();

	if (session?.user?.group !== 'ADMIN') {
		return <NotAuthenticated />;
	}

	return (
		<>
			<Heading>Super upea admin näkymä</Heading>
			<Link as={NextLink} href='/admin/createItem'>
				<Button>Luo uusi kama</Button>
			</Link>
			<Link as={NextLink} href='/admin/manageUsers'>
				<Button>Hallitse käyttäjiä</Button>
			</Link>
		</>
	);
}
