import React, { useState } from "react";
import prisma from "../../utils/prisma";
import {
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Tag,
  Text,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import { LoanStatus } from "@prisma/client";
import type { GetServerSideProps } from "next";
import NotAuthenticated from "../../components/NotAuthenticated";
import { useRouter } from "next/router";

interface Reservation {
  id: string;
  amount: number;
  item: {
    id: string;
    name: string;
  };
}

interface LoanType {
  id: string;
  userId: string;
  status: LoanStatus;
  description: string | null;
  startTime: Date;
  endTime: Date;
  loaner: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
  reservations: Reservation[];
}

export const getServerSideProps: GetServerSideProps = async () => {
  const loans = await prisma.loan.findMany({
    where: {
      status: LoanStatus.INUSE,
    },
    include: {
      user: true,
      reservations: {
        include: {
          item: true,
        },
      },
    },
    orderBy: {
      startTime: "desc",
    },
  });

  return {
    props: {
      loans: JSON.parse(JSON.stringify(loans)),
    },
  };
};

const LoanReturnCard = ({
  loan,
  onReturn,
}: {
  loan: LoanType;
  onReturn: (id: string) => void;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        p={4}
        mb={4}
        bg="white"
      >
        <Stack spacing={3}>
          <Heading size="md">{loan.description || loan.loaner}</Heading>
          <Tag colorScheme="blue" width="fit-content">
            Käytössä
          </Tag>
          <Text>Lainaaja: {loan.loaner}</Text>
          <Text>
            Laina-aika: {new Date(loan.startTime).toLocaleDateString()} -{" "}
            {new Date(loan.endTime).toLocaleDateString()}
          </Text>
          <Box>
            <Text fontWeight="bold" mb={2}>
              Tavarat:
            </Text>
            {loan.reservations.map((reservation) => (
              <Text key={reservation.id} ml={4}>
                • {reservation.item.name} ({reservation.amount} kpl)
              </Text>
            ))}
          </Box>
          <Button colorScheme="green" onClick={onOpen} size="lg">
            Palauta
          </Button>
        </Stack>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Vahvista palautus</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="start" spacing={2}>
              <Text fontWeight="bold">
                Oletko palauttamassa seuraavat tavarat?
              </Text>
              {loan.reservations.map((reservation) => (
                <Text key={reservation.id}>
                  • {reservation.item.name} ({reservation.amount} kpl)
                </Text>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Peruuta
            </Button>
            <Button
              colorScheme="green"
              onClick={() => {
                onReturn(loan.id);
                onClose();
              }}
            >
              Vahvista palautus
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default function KioskReturn({ loans }: { loans: LoanType[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();
  const handleReturn = async (loanId: string) => {
    try {
      const response = await fetch("/api/loan/loanReturned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: loanId }),
      });

      if (response.ok) {
        toast({
          title: "Palautus onnistui!",
          description: "Laina on merkitty palautetuksi.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        router.reload();
      } else {
        throw new Error("Palautus epäonnistui");
      }
    } catch {
      toast({
        title: "Virhe",
        description: "Palautus epäonnistui. Yritä uudelleen.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (session?.user?.group !== "KIOSK") {
    return <NotAuthenticated />;
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <Box>
          <Heading mb={4}>Palauta lainoja</Heading>
          <Button mb={4} onClick={() => router.push("/")} colorScheme="gray">
            Takaisin etusivulle
          </Button>

          {loans.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Heading size="md" color="gray.500">
                Ei käytössä olevia lainoja
              </Heading>
            </Box>
          ) : (
            loans.map((loan) => (
              <LoanReturnCard
                key={loan.id}
                loan={loan}
                onReturn={handleReturn}
              />
            ))
          )}
        </Box>
      </Stack>
    </Container>
  );
}
