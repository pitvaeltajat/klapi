import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../../components/NotAuthenticated';
import {
	Heading,
	Input,
	Image,
	Textarea,
	NumberInput,
	NumberInputField,
	NumberInputStepper,
	NumberIncrementStepper,
	NumberDecrementStepper,
	Button,
	useToast,
} from '@chakra-ui/react';
import { use, useEffect, useState } from 'react';
import { CreatableSelect, Select } from 'chakra-react-select';
import { useRouter } from 'next/router';

export async function getServerSideProps(req, res) {
	const item = await prisma.item.findUnique({
		where: {
			id: req.params.id,
		},
		include: {
			categories: true,
			reservations: { include: { loan: true } },
		},
	});
	const categories = await prisma.category.findMany({
		orderBy: { name: 'asc' },
	});
	return { props: { item, categories } };
}

export default function EditItem({ item, categories }) {
	const { data: session } = useSession();

	const router = useRouter();
	const toast = useToast();

	const [itemName, setItemName] = useState(item.name);
	const handleNameChange = (e) => {
		setItemName(e.target.value);
	};

	const [itemCategories, setItemCategories] = useState(item.categories);
	const handleCategoryChange = (e) => {
		setItemCategories(e.target.value);
	};

	const [itemDescription, setItemDescription] = useState(item.description);
	const handleDescriptionChange = (e) => {
		setItemDescription(e.target.value);
	};

	const [itemAmount, setItemAmount] = useState(item.amount);

	const [image, setImage] = useState(null);
	const handleImageChange = (e) => {
		const image = e.target.files[0];
		setImage(image);
	};

	const [isSubmitting, setIsSubmitting] = useState(false);

	const submitImage = async () => {
		setIsSubmitting(true);
		const response = await fetch('/api/item/uploadImage', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ filename: item.id, contentType: image.type }),
		});
		if (response.status === 200) {
			const { url, fields } = await response.json();
			const formData = new FormData();
			Object.entries(fields).forEach(([key, value]) => {
				formData.append(key, value);
			});
			formData.append('file', image);

			const uploadResponse = await fetch(url, {
				method: 'POST',
				body: formData,
			});

			if (uploadResponse.ok) {
				console.log('Image uploaded');
			} else {
				console.error('Image upload failed');
			}
		}
	};

	const updateItem = async () => {
		if (image) {
			await submitImage();
		}
		const response = await fetch('/api/item/editItem', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				id: item.id,
				name: itemName,
				description: itemDescription,
				amount: itemAmount,
				image: image ? `https://klapi-item-photos.s3.eu-north-1.amazonaws.com/${item.id}` : undefined,
				categories: itemCategories,
			}),
		});
		if (response.ok) {
			setIsSubmitting(false);
			toast({
				title: 'Kama päivitetty',
				status: 'success',
				duration: 5000,
				isClosable: true,
			});
			router.replace(router.asPath);
		} else {
			setIsSubmitting(false);
			toast({
				title: 'Virhe kaman päivityksessä',
				status: 'error',
				duration: 5000,
				isClosable: true,
			});
		}
	};

	if (session?.user?.group !== 'ADMIN') {
		return <NotAuthenticated />;
	}

	return (
		<>
			<Heading as='h1' size='md' marginBottom={'1em'}>
				Muokkaa kamaa
			</Heading>
			<Heading as='h3' size='sm' marginBottom={'1em'}>
				Nimi:
			</Heading>
			<Input
				placeholder='Mäkihyppylehti'
				marginBottom={'1em'}
				value={itemName}
				onChange={handleNameChange}
				width={'20em'}
				borderColor={itemName === item.name ? 'gray.300' : 'orange.300'}
				borderWidth={itemName === item.name ? '1px' : '2px'}
			/>

			<Heading as='h3' size='sm' marginBottom={'1em'}>
				Kuvaus:
			</Heading>
			<Textarea
				placeholder='Viihteeksi reissuille kaluston vessaan.'
				marginBottom={'1em'}
				value={itemDescription || ''}
				onChange={handleDescriptionChange}
				width={'20em'}
				borderColor={itemDescription === item.description ? 'gray.300' : 'orange.300'}
				borderWidth={itemDescription === item.description ? '1px' : '2px'}
			/>

			<Heading as='h3' size='sm' marginBottom={'1em'}>
				Kategoriat:
			</Heading>

			<CreatableSelect
				isMulti
				value={itemCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
				options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
				defaultValue={item.categories.map((cat) => ({ value: cat.id, label: cat.name }))}
				onChange={(e) => setItemCategories(e.map((cat) => ({ name: cat.label, id: cat.value })))}
				isInvalid={itemCategories !== item.categories}
				errorBorderColor='orange.300'
			/>

			<Heading as='h3' size='sm' marginBottom={'1em'}>
				Määrä:
			</Heading>
			<NumberInput
				min={1}
				width={'20em'}
				marginBottom={'1em'}
				borderColor={itemAmount === item.amount ? 'grey.300' : 'orange.300'}
				value={itemAmount}
				onChange={(value) => setItemAmount(parseInt(value))}
			>
				<NumberInputField />
				<NumberInputStepper>
					<NumberIncrementStepper />
					<NumberDecrementStepper />
				</NumberInputStepper>
			</NumberInput>

			<Heading as='h3' size='sm' marginBottom={'1em'}>
				Kuva:
			</Heading>
			{image !== null ? (
				<Image src={URL.createObjectURL(image)} alt={item.name} width={'20em'} />
			) : item.image !== null ? (
				<Image src={item.image} alt={item.name} width={'20em'} />
			) : null}
			<Input type='file' accept='image/*' onChange={handleImageChange} />

			<Button onClick={updateItem} isLoading={isSubmitting}>
				Tallenna
			</Button>
		</>
	);
}
