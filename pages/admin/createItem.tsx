import React, { useState } from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  Image,
  Button,
  Heading,
  NumberInputField,
  NumberInput,
  NumberIncrementStepper,
  NumberDecrementStepper,
  NumberInputStepper,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { CreatableSelect } from 'chakra-react-select';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../components/NotAuthenticated';
import type { NextPage } from 'next';
import type { Category, Location } from '@prisma/client';

interface SelectOption {
  value: string;
  label: string;
}

interface LocationWithLabel extends Location {
  label: string;
  value: string;
}

interface CategoryWithLabel extends Category {
  label: string;
  value: string;
}

const CreateItem: NextPage = () => {
  const { data: session } = useSession();
  const toast = useToast();
  const router = useRouter();

  const { data: locations, error: locationsError } = useSWR<LocationWithLabel[]>(
    '/api/location/getLocations',
  );

  const { data: categories, error: categoriesError } = useSWR<CategoryWithLabel[]>(
    '/api/category/getCategories',
  );

  const [name, setName] = useState('');
  const [amount, setAmount] = useState(1);
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectOption | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    if (file) setPreviewUrl(URL.createObjectURL(file));
    else setPreviewUrl(null);
  };

  const resetForm = () => {
    setName('');
    setAmount(1);
    setDescription('');
    setSelectedCategories([]);
    setSelectedLocation(null);
    setImage(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const values = {
        name,
        amount,
        description,
        categories: selectedCategories,
        locationId: selectedLocation,
      };

      const createResp = await fetch('/api/item/createItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!createResp.ok) throw new Error('Failed to create item');

      const created = await createResp.json();
      const itemId = created.id;

      if (image) {
        const uploadResp = await fetch('/api/item/uploadImage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: itemId, contentType: image.type }),
        });

        if (uploadResp.ok) {
          const { url, fields } = await uploadResp.json();
          const formData = new FormData();
          Object.entries(fields).forEach(([key, value]) => {
            formData.append(key, value as string);
          });
          formData.append('file', image);

          await fetch(url, { method: 'POST', body: formData });

          await fetch('/api/item/editItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: itemId,
              name,
              description,
              amount,
              image: `${process.env.NEXT_PUBLIC_AWS_ITEM_PHOTOS_URL}/${itemId}`,
              categories: selectedCategories.map((c) => ({
                id: c.value,
                name: c.label,
              })),
            }),
          });
        }
      }

      toast({
        title: 'Item created',
        description: 'Item created successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      resetForm();
      router.push(`/admin/edititem/${itemId}`);
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  if (locationsError || categoriesError) return <div>failed to load</div>;

  if (!categories || !locations) return <div>loading...</div>;

  const locationOptions = locations.map((location) => ({
    ...location,
    label: location.name,
    value: location.id,
  }));

  const categoryOptions = categories.map((category) => ({
    ...category,
    label: category.name,
    value: category.id,
  }));

  return (
    <>
      <Heading>Luo uusi kama</Heading>

      <form onSubmit={handleSubmit}>
        <FormControl isRequired>
          <FormLabel htmlFor="name">Nimi</FormLabel>
          <Input
            id="name"
            placeholder="PJ-teltta"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel htmlFor="amount">Määrä</FormLabel>
          <NumberInput
            id="amount"
            min={1}
            value={amount}
            onChange={(val) => setAmount(Number(val))}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel htmlFor="description">Kuvaus</FormLabel>
          <Textarea
            id="description"
            placeholder="Kamaa käytetään..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel htmlFor="categories">Kategoriat</FormLabel>
          <CreatableSelect
            id="categories"
            isMulti
            options={categoryOptions}
            name="categories"
            placeholder="Retkikeittimet"
            value={selectedCategories}
            onChange={(option) => setSelectedCategories([...option])}
            isClearable
            backspaceRemovesValue
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel htmlFor="locationId">Sijainti</FormLabel>
          <CreatableSelect
            options={locationOptions}
            id="locationId"
            name="locationId"
            placeholder="Kolon vessa"
            value={selectedLocation}
            onChange={(option) => setSelectedLocation(option)}
            isClearable
          />
        </FormControl>

        <FormControl marginTop={4}>
          <FormLabel>Kuva</FormLabel>
          <Input type="file" accept="image/*" onChange={handleImageChange} />
          {previewUrl ? <Image src={previewUrl} alt="Preview" mt={2} maxW="300px" /> : null}
        </FormControl>

        <Button mt={4} colorScheme="teal" isLoading={isSubmitting} type="submit">
          Luo kama
        </Button>
      </form>
    </>
  );
};

export default CreateItem;
