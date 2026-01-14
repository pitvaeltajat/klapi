// get item by id and return it
import prisma from "../../utils/prisma";
import { Item, Category, Reservation, LoanStatus } from "@prisma/client";

import React from "react";
import { useRouter } from "next/router";
import {
  Image,
  Heading,
  Button,
  Dialog,
  useDisclosure,
  useToast,
  VStack,
  Box,
  HStack,
  Container,
} from "@chakra-ui/react";
import ReservationTable from "../../components/ReservationTable";
import { useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import { cardStyles, headingSizes, spacing, containerMaxWidth, buttonColors } from "@/styles/designTokens";

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
  if (!params?.id || typeof params.id !== "string") {
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

  const deleteItem = async () => {
    try {
      const response = await fetch("/api/item/deleteItem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item.id),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Item deleted",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        onClose();
        router.push("/");
      } else {
        throw new Error("Failed to delete item");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW={containerMaxWidth} {...spacing.containerPadding}>
      <VStack spacing={spacing.sectionSpacing} align="stretch">
        <Box {...cardStyles.base}>
          <VStack spacing={spacing.elementSpacing} align="stretch">
            <Heading size={headingSizes.pageTitle}>{item.name}</Heading>
            {item.description && (
              <Text color="gray.700">{item.description}</Text>
            )}
            {item.image && (
              <Box>
                <Image
                  maxW="500px"
                  src={item.image}
                  alt={item.name}
                  fallbackSrc="https://placehold.co/500x300"
                  borderRadius="lg"
                />
              </Box>
            )}
            {session?.user?.group === "ADMIN" && (
              <HStack spacing={spacing.tightSpacing}>
                <Button
                  colorScheme={buttonColors.secondary}
                  onClick={() => router.push(`/admin/edititem/${item.id}`)}
                >
                  Muokkaa
                </Button>
                <Button colorScheme={buttonColors.danger} onClick={onOpen}>
                  Poista
                </Button>
              </HStack>
            )}
          </VStack>
        </Box>

        <Box {...cardStyles.base}>
          <Heading size={headingSizes.sectionTitle} mb={spacing.elementSpacing}>
            Varaushistoria
          </Heading>
          <ReservationTable reservations={item.reservations} />
        </Box>

        <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Poistetaanko kama?</Dialog.Title>
                <Dialog.CloseTrigger />
              </Dialog.Header>
              <Dialog.Body>
                <strong>{item.name}</strong> poistetaan. Oletko varma?
              </Dialog.Body>

              <Dialog.Footer>
                <Button colorScheme={buttonColors.danger} mr={3} onClick={deleteItem}>
                  Poista
                </Button>
                <Button colorScheme={buttonColors.secondary} onClick={onClose}>
                  Peruuta
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </VStack>
    </Container>
  );
}
