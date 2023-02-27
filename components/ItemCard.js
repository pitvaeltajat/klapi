import { Flex, Box, Image, useColorModeValue, Button, useToast, Circle } from '@chakra-ui/react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/cart.slice';

export default function ItemCard({ item, availableAmount }) {
	const dispatch = useDispatch();

	const toast = useToast();
	const addItemToCart = (item) => {
		dispatch(addToCart(item));
		toast({
			title: 'Lisättiin kama',
			description: `${item.name} lisätty ostoskoriin`,
			status: 'success',
			duration: 1500,
			isClosable: true,
		});
	};

	const cartItems = useSelector((state) => state.cart.items);
	const cart = useSelector((state) => state.cart);
	const dates = useSelector((state) => state.dates);

	const amountInCart =
		cartItems.find((cartItem) => cartItem.id == item.id) != undefined
			? cartItems.find((cartItem) => cartItem.id == item.id).amount
			: 0;

	return (
		<Box w='full' alignItems='center' justifyContent='center'>
			<Box
				bg={useColorModeValue('white', 'gray.800')}
				maxW='sm'
				borderWidth='1px'
				rounded='lg'
				shadow='lg'
				position='relative'
				_hover={{ shadow: '2xl', transform: 'scale(1.01)', transition: 'all 0.2s', zIndex: 1 }}
			>
				<Image
					src={item.image}
					alt={`Picture of ${item.name}`}
					roundedTop='lg'
					objectFit='cover'
					objectPosition='center'
					w='full'
					h='full'
					fallbackSrc='https://via.placeholder.com/500x300'
				/>

				<Box p='6'>
					<Flex mt='1' justifyContent='space-between' alignContent='center'>
						<Box
							fontSize='2xl'
							fontWeight='semibold'
							as='h4'
							lineHeight='tight'
							isTruncated
							overflow='hidden'
							noOfLines='1'
							title={item.name}
							_hover={{ textDecoration: 'underline' }}
						>
							<Link href={'/item/' + item.id}>{item.name}</Link>
						</Box>
					</Flex>
					<Box>
						<Button
							onClick={() => addItemToCart(item)}
							size='sm'
							alignSelf={'center'}
							colorScheme='blue'
							isDisabled={availableAmount - amountInCart <= 0}
						>
							Lisää koriin
							<Circle
								position='absolute'
								right='-7px'
								top='-7px'
								size='20px'
								bg='red'
								color='white'
								display={
									cartItems.filter((cartItem) => cartItem.id === item.id).map((cartItem) => cartItem.amount) >
									0
										? 'block'
										: 'none'
								}
							>
								{cartItems.filter((cartItem) => cartItem.id === item.id).map((cartItem) => cartItem.amount)}
							</Circle>
						</Button>
					</Box>
					<Box fontSize='medium' fontWeight='semibold' as='h4' lineHeight='tight' isTruncated>
						Saatavilla: {availableAmount - amountInCart}
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
