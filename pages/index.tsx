import React from 'react';
import prisma from '../utils/prisma';
import DateSelector from '../components/DateSelector';
import KioskModeSelector from '../components/KioskModeSelector';
import KioskDateSelector from '../components/KioskDateSelector';
import {
	Box,
	Heading,
	Input,
	InputGroup,
	InputRightElement,
	Button,
	Wrap,
	WrapItem,
	Text,
	Link,
	useDisclosure,
} from '@chakra-ui/react';
import { FaSearch } from 'react-icons/fa';
import AllItems from './productlist';
import type { GetServerSideProps } from 'next';
import type { Item, Category, Loan, Reservation } from '@prisma/client';
import { useDates } from '@/contexts/DatesContext';
import { useSession } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';
import CustomItemDialog from '../components/CustomItemDialog';

interface ItemWithRelations extends Item {
	categories: Category[];
	reservations: (Reservation & { loan: Loan })[];
}

interface IndexProps {
	items: ItemWithRelations[];
	categories: Category[];
}

export const getServerSideProps: GetServerSideProps<IndexProps> = async () => {
	const items = await prisma.item.findMany({
		include: {
			categories: true,
			reservations: { include: { loan: true } },
		},
		orderBy: { name: 'asc' },
	});
	const categories = await prisma.category.findMany({
		include: {
			items: true,
		},
	});
	return { props: { items, categories } };
};

export default function Index({ items, categories }: IndexProps) {
	const { state: dates } = useDates();
	const { data: session } = useSession();
	const { state: cart } = useCart();

	const [search, setSearch] = React.useState('');
	const [category, setCategory] = React.useState('');

	const isKioskMode = session?.user?.group === 'KIOSK';

	const { isOpen, onOpen, onClose } = useDisclosure();

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value);
	};

	const filteredItems = items
		.filter((item) => {
			return item.name.toLowerCase().includes(search.toLowerCase());
		})
		.filter((item) => {
			if (category === '') {
				return true;
			} else {
				return item.categories.some((cat) => cat.name === category);
			}
		});

	return (
		<>
			{isKioskMode ? (
				// Kiosk mode flow
				<>
					{!cart.loaner ? (
						<KioskModeSelector />
					) : dates.datesSet ? (
						<>
							<KioskDateSelector />
							<Box padding='4px'>
								<InputGroup width={'fit-content'}>
									<Input
										placeholder='Hae kamoja'
										marginBottom={'1em'}
										value={search}
										onChange={handleChange}
									/>
									<InputRightElement>
										<FaSearch />
									</InputRightElement>
								</InputGroup>
							</Box>
							<Box padding='2em' paddingLeft={0}>
								<Heading as='h2' size='md' marginBottom={'1em'}>
									Kategoriat
								</Heading>
								<Wrap padding='4px'>
									<WrapItem key='all'>
										<Button onClick={() => setCategory('')}>Kaikki</Button>
									</WrapItem>
									{categories.map((category) => (
										<WrapItem key={category.id}>
											<Button onClick={() => setCategory(category.name)}>{category.name}</Button>
										</WrapItem>
									))}
								</Wrap>
							</Box>
							<Box padding='1em' paddingLeft={0}>
								{category !== '' && (
									<Heading as='h2' size='md' marginBottom={'1em'}>
										Valittu kategoria: {category}
									</Heading>
								)}
							</Box>
							<>
								<Box marginBottom={'1em'}>
									<Text>
										Jos haluamaasi kamaa ole lisättu valikoimaan klikkaa{' '}
										<Link color='teal.500' onClick={onOpen}>
											tästä
										</Link>
									</Text>
								</Box>
								<CustomItemDialog isOpen={isOpen} onClose={onClose} />
								{filteredItems.length > 0 ? (
									<AllItems items={filteredItems} categories={categories} />
								) : (
									<Heading textAlign='center' marginTop='1em'>
										Ei hakutuloksia :(
									</Heading>
								)}
							</>
						</>
					) : null}
				</>
			) : (
				// Normal mode flow
				<>
					{dates.datesSet ? (
						<>
							<DateSelector />
							<Box padding='4px'>
								<InputGroup width={'fit-content'}>
									<Input
										placeholder='Hae kamoja'
										marginBottom={'1em'}
										value={search}
										onChange={handleChange}
									/>
									<InputRightElement>
										<FaSearch />
									</InputRightElement>
								</InputGroup>
							</Box>
							<Box padding='2em' paddingLeft={0}>
								<Heading as='h2' size='md' marginBottom={'1em'}>
									Kategoriat
								</Heading>
								<Wrap padding='4px'>
									<WrapItem key='all'>
										<Button onClick={() => setCategory('')}>Kaikki</Button>
									</WrapItem>
									{categories.map((category) => (
										<WrapItem key={category.id}>
											<Button onClick={() => setCategory(category.name)}>{category.name}</Button>
										</WrapItem>
									))}
								</Wrap>
							</Box>
							<Box padding='1em' paddingLeft={0}>
								{category !== '' && (
									<Heading as='h2' size='md' marginBottom={'1em'}>
										Valittu kategoria: {category}
									</Heading>
								)}
							</Box>
							<>
								<Box marginBottom={'1em'}>
									<Text>
										Jos haluamaasi kamaa ole lisättu valikoimaan klikkaa{' '}
										<Link color='teal.500' onClick={onOpen}>
											tästä
										</Link>
									</Text>
								</Box>
								<CustomItemDialog isOpen={isOpen} onClose={onClose} />
								{filteredItems.length > 0 ? (
									<AllItems items={filteredItems} categories={categories} />
								) : (
									<Heading textAlign='center' marginTop='1em'>
										Ei hakutuloksia :(
									</Heading>
								)}
							</>
						</>
					) : (
						<DateSelector />
					)}
				</>
			)}
		</>
	);
}
