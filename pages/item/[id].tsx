// get item by id and return it
import prisma from "../../utils/prisma";
import { Item, Category, Reservation, Loan, LoanStatus } from "@prisma/client";

import React from "react";
import { useRouter } from "next/router";
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
} from "@chakra-ui/react";
import ReservationTable from "../../components/ReservationTable";
import { useSession } from "next-auth/react";
import type { NextApiRequest } from "next";
import { GetServerSideProps } from "next";

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

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/loan/createLoan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: item.id,
          amount: 1,
          description: item.description,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Loan created successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        router.push("/account");
      } else {
        throw new Error("Failed to create loan");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <div>
      <h1>{item.name}</h1>
      <p>{item.description}</p>
      {item.image && (
        <Image
          width="500px"
          marginBottom="0.5em"
          src={item.image}
          alt={item.name}
          fallbackSrc="https://placehold.co/500x300"
        />
      )}
      {session?.user?.group === "ADMIN" ? (
        <>
          <Button
            marginEnd="0.5em"
            onClick={() => router.push(`/admin/edititem/${item.id}`)}
          >
            Muokkaa
          </Button>
          <Button onClick={onOpen}>Poista</Button>
        </>
      ) : null}

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
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
      <Heading>Varaustilanne</Heading>
      <ReservationTable reservations={item.reservations} />
    </div>
  );
}
