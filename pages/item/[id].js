// get item by id and return it
import prisma from "/utils/prisma";
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

export async function getServerSideProps(req, res) {
  const item = await prisma.item.findUnique({
    where: {
      id: req.params.id,
    },
    include: {
      reservations: {
        include: {
          loan: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });
  if (!item) {
    return {
      notFound: true,
    };
  }
  return {
    props: {
      item,
    },
  };
}

export default function ItemView({ item }) {
  const router = useRouter();
  const toast = useToast();

  const { data: session, status } = useSession();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const [isEditing, setIsEditing] = React.useState(false);

  const deleteItem = async () => {
    // use api route to delete item
    await fetch("/api/item/deleteItem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item.id),
    })
      .then(
        toast({
          title: "Success",
          description: "Item deleted",
          status: "success",
          duration: 5000,
          isClosable: true,
        })
      )
      .catch((err) => {
        toast({
          title: "Error",
          description: err.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      });
    onClose();
    // redirect to home page with router
    router.push("/");
  };

  return (
    <>
      <Heading marginBottom="1em">{item.name}</Heading>
      {item.description && <p>{item.description}</p>}

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
    </>
  );
}
