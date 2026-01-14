import { useSession } from "next-auth/react";
import NotAuthenticated from "../../../components/NotAuthenticated";
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
  VStack,
  FormControl,
  FormLabel,
  Container,
  Box,
} from "@chakra-ui/react";

import { toaster, Toaster } from "@/components/ui/toaster";

import { useState } from "react";
import { CreatableSelect, MultiValue } from "chakra-react-select";
import { useRouter } from "next/router";
import prisma from "../../../utils/prisma";
import { Item, Category } from "@prisma/client";
import { GetServerSideProps } from "next";
import {
  cardStyles,
  headingSizes,
  spacing,
  containerMaxWidth,
  buttonColors,
} from "@/styles/designTokens";

interface ItemWithRelations extends Item {
  categories: Category[];
  reservations: {
    loan: {
      id: string;
      status: string;
      startTime: Date;
      endTime: Date;
    };
  }[];
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  if (!params?.id || typeof params.id !== "string") {
    return { notFound: true };
  }

  const item = await prisma.item.findUnique({
    where: {
      id: params.id,
    },
    include: {
      categories: true,
      reservations: { include: { loan: true } },
    },
  });

  if (!item) {
    return { notFound: true };
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return { props: { item, categories } };
};

export default function EditItem({
  item,
  categories,
}: {
  item: ItemWithRelations;
  categories: Category[];
}) {
  const { data: session } = useSession();
  const router = useRouter();

  const [itemName, setItemName] = useState(item.name);
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setItemName(e.target.value);
  };

  const [itemCategories, setItemCategories] = useState(item.categories);

  const [itemDescription, setItemDescription] = useState(item.description);
  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setItemDescription(e.target.value);
  };

  const [itemAmount, setItemAmount] = useState(item.amount);

  const [image, setImage] = useState<File | null>(null);
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitImage = async () => {
    if (!image) return;

    setIsSubmitting(true);
    const response = await fetch("/api/item/uploadImage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename: item.id, contentType: image.type }),
    });

    if (response.status === 200) {
      const { url, fields } = await response.json();
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append("file", image);

      await fetch(url, {
        method: "POST",
        body: formData,
      });
    }
  };

  const updateItem = async () => {
    if (image) {
      await submitImage();
    }

    const response = await fetch("/api/item/editItem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: item.id,
        name: itemName,
        description: itemDescription,
        amount: itemAmount,
        image: image
          ? `https://klapi-item-photos.s3.eu-north-1.amazonaws.com/${item.id}`
          : undefined,
        categories: itemCategories,
      }),
    });

    if (response.ok) {
      setIsSubmitting(false);
      toaster.create({
        title: "Kama päivitetty",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      router.replace(router.asPath);
    } else {
      setIsSubmitting(false);
      toaster.create({
        title: "Virhe kaman päivityksessä",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (session?.user?.group !== "ADMIN") {
    return <NotAuthenticated />;
  }

  return (
    <Container maxW={containerMaxWidth} {...spacing.containerPadding}>
      <VStack gap={spacing.sectionSpacing} align="stretch">
        <Heading as="h1" size={headingSizes.pageTitle}>
          Muokkaa kamaa
        </Heading>

        <Box {...cardStyles.base}>
          <VStack gap={spacing.elementSpacing} align="stretch">
            <FormControl>
              <FormLabel>Nimi</FormLabel>
              <Input
                placeholder="Mäkihyppylehti"
                value={itemName}
                onChange={handleNameChange}
                maxW="400px"
                borderColor={itemName === item.name ? "gray.300" : "orange.300"}
                borderWidth={itemName === item.name ? "1px" : "2px"}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Kuvaus</FormLabel>
              <Textarea
                placeholder="Viihteeksi reissuille kaluston vessaan."
                value={itemDescription || ""}
                onChange={handleDescriptionChange}
                maxW="400px"
                borderColor={
                  itemDescription === item.description
                    ? "gray.300"
                    : "orange.300"
                }
                borderWidth={
                  itemDescription === item.description ? "1px" : "2px"
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel>Kategoriat</FormLabel>
              <Box maxW="400px">
                <CreatableSelect
                  isMulti
                  value={itemCategories.map((cat: Category) => ({
                    value: cat.id,
                    label: cat.name,
                  }))}
                  options={categories.map((cat: Category) => ({
                    value: cat.id,
                    label: cat.name,
                  }))}
                  defaultValue={item.categories.map((cat: Category) => ({
                    value: cat.id,
                    label: cat.name,
                  }))}
                  onChange={(e: MultiValue<{ value: string; label: string }>) =>
                    setItemCategories(
                      e.map((cat: { label: string; value: string }) => ({
                        name: cat.label,
                        id: cat.value,
                        description: null,
                      }))
                    )
                  }
                  invalid={itemCategories !== item.categories}
                  errorBorderColor="orange.300"
                />
              </Box>
            </FormControl>

            <FormControl>
              <FormLabel>Määrä</FormLabel>
              <NumberInput
                min={1}
                maxW="200px"
                borderColor={
                  itemAmount === item.amount ? "gray.300" : "orange.300"
                }
                value={itemAmount}
                onChange={(valueString) => setItemAmount(parseInt(valueString))}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>Kuva</FormLabel>
              {image !== null ? (
                <Image
                  src={URL.createObjectURL(image)}
                  alt={item.name}
                  maxW="400px"
                  borderRadius="md"
                  mb={spacing.tightSpacing}
                />
              ) : item.image !== null ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  maxW="400px"
                  borderRadius="md"
                  mb={spacing.tightSpacing}
                />
              ) : null}
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                maxW="400px"
              />
            </FormControl>

            <Button
              onClick={updateItem}
              loading={isSubmitting}
              colorScheme={buttonColors.success}
              maxW="200px"
            >
              Tallenna
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
