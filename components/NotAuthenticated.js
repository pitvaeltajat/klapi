import { Heading, Button, Link } from '@chakra-ui/react';
import NextLink from 'next/link';

export default function NotAuthenticated() {
	return (
		<>
			<Heading>Ei käyttöoikeutta</Heading>
			<Link as={NextLink} href='/'>
				<Button>Palaa etusivulle</Button>
			</Link>
		</>
	);
}
