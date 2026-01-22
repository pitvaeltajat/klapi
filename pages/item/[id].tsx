// get item by id and return it
import prisma from '../../utils/prisma';
import { Item, Category, Reservation, LoanStatus } from '@prisma/client';
import { useItemOriginalImage, usePlaceholder } from '../../hooks/useItemImage';

import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Image,
  Heading,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  VStack,
  Text,
  HStack,
  Box,
  Badge,
  Divider,
  SimpleGrid,
} from '@chakra-ui/react';
import ReservationTable from '../../components/ReservationTable';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useSession } from 'next-auth/react';
import { GetServerSideProps } from 'next';

interface ItemWithRelations extends Item {
  categories: Category[];
  reservations: (Reservation & {
    loan: {
      id: string;
      description: string | null;
      status: LoanStatus;
      startTime: Date;
      endTime: Date;
      userId: string;
    };
    item: {
      name: string;
    };
  })[];
}

export const getServerSideProps: GetServerSideProps<{
  item: ItemWithRelations;
}> = async ({ params }) => {
  if (!params?.id || typeof params.id !== 'string') {
    return { notFound: true };
  }

  const item = await prisma.item.findUnique({
    where: {
      id: params.id,
    },
    include: {
      categories: true,
      reservations: {
        include: {
          loan: true,
          item: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!item) {
    return { notFound: true };
  }

  return {
    props: {
      item: JSON.parse(JSON.stringify(item)),
    },
  };
};

export default function ItemView({ item }: { item: ItemWithRelations }) {
  const router = useRouter();
  const toast = useToast();

  const { data: session } = useSession();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const imageSrc = useItemOriginalImage(item.id);
  const placeholder = usePlaceholder();

  const deleteItem = async () => {
    try {
      const response = await fetch('/api/item/deleteItem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.id),
      });

      if (response.ok) {
        toast({
          title: 'Legit',
          description: 'Kama poistettu',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        onClose();
        router.push('/');
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <Head>
        <title>{item.name} | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: item.name }]} />
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size={{ base: 'lg', md: 'xl' }}>
          {item.name}
        </Heading>

        {item.description && (
          <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.700">
            {item.description}
          </Text>
        )}

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Box>
            <Text fontSize="sm" color="gray.600" fontWeight="semibold">
              Määrä:
            </Text>
            <Text fontSize="lg" fontWeight="bold">
              {item.amount} kpl
            </Text>
          </Box>
          {item.categories && item.categories.length > 0 && (
            <Box>
              <Text fontSize="sm" color="gray.600" fontWeight="semibold" mb={2}>
                Kategoriat:
              </Text>
              <HStack spacing={2} flexWrap="wrap">
                {item.categories.map((category) => (
                  <Badge key={category.id} colorScheme="blue" fontSize="sm">
                    {category.name}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}
        </SimpleGrid>

        <Divider />

        <Box>
          <Image
            src={imageSrc}
            alt={item.name}
            fallbackSrc={placeholder}
            maxW="full"
            maxH={{ base: '300px', md: '500px' }}
            objectFit="contain"
            borderRadius="md"
          />
        </Box>

        {session?.user?.group === 'ADMIN' && (
          <HStack spacing={3}>
            <Button colorScheme="blue" onClick={() => router.push(`/admin/edititem/${item.id}`)}>
              Muokkaa
            </Button>
            <Button colorScheme="red" onClick={onOpen}>
              Poista
            </Button>
          </HStack>
        )}

        <Box mt={4}>
          <Heading size="md" mb={4}>
            Varaushistoria
          </Heading>
          <ReservationTable reservations={item.reservations} />
        </Box>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader>Poistetaanko kama?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <strong>{item.name}</strong> poistetaan. Oletko varma?
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={deleteItem}>
              Poista
            </Button>
            <Button colorScheme="gray" onClick={onClose}>
              Peruuta
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
