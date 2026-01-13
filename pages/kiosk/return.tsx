import React from "react";
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
  Image,
  HStack,
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
    image: string | null;
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
  onReturn: (id: string) => Promise<{ name: string; description: string | null } | null>;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isBoxInstructionsOpen,
    onOpen: onBoxInstructionsOpen,
    onClose: onBoxInstructionsClose,
  } = useDisclosure();
  const [boxInfo, setBoxInfo] = React.useState<{
    name: string;
    description: string | null;
  } | null>(null);

  const handleConfirmReturn = async () => {
    const box = await onReturn(loan.id);
    onClose();
    if (box) {
      setBoxInfo(box);
      onBoxInstructionsOpen();
    }
  };

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
            <VStack align="start" spacing={3}>
              <Text fontWeight="bold">
                Oletko palauttamassa seuraavat tavarat?
              </Text>
              {loan.reservations.map((reservation) => (
                <HStack key={reservation.id} spacing={3} width="100%">
                  {reservation.item.image && (
                    <Image
                      src={reservation.item.image}
                      alt={reservation.item.name}
                      boxSize="50px"
                      objectFit="cover"
                      borderRadius="md"
                    />
                  )}
                  <Text>
                    {reservation.item.name} ({reservation.amount} kpl)
                  </Text>
                </HStack>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Peruuta
            </Button>
            <Button colorScheme="green" onClick={handleConfirmReturn}>
              Vahvista palautus
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isBoxInstructionsOpen}
        onClose={onBoxInstructionsClose}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Palautusohje</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="start" spacing={4}>
              <Box
                p={6}
                bg="blue.50"
                borderRadius="lg"
                width="100%"
                textAlign="center"
              >
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Palauta tavarat lokeroon:
                </Text>
                <Heading size="2xl" color="blue.600">
                  {boxInfo?.name}
                </Heading>
              </Box>
              {boxInfo?.description && (
                <Box
                  p={4}
                  bg="gray.50"
                  borderRadius="md"
                  width="100%"
                >
                  <Text fontWeight="bold" mb={2}>
                    Lisätiedot:
                  </Text>
                  <Text>{boxInfo.description}</Text>
                </Box>
              )}
              <Text color="gray.600" fontSize="sm">
                Kiitos palauttamisesta! Muista laittaa kaikki tavarat oikeaan
                lokeroon.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onBoxInstructionsClose} size="lg">
              Sulje
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
  const handleReturn = async (
    loanId: string
  ): Promise<{ name: string; description: string | null } | null> => {
    try {
      const response = await fetch("/api/loan/loanReturned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: loanId }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Palautus onnistui!",
          description: "Laina on merkitty palautetuksi.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });

        // Reload after a delay to allow the box instructions modal to be shown
        setTimeout(() => {
          router.reload();
        }, 100);

        return result.box;
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
      return null;
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
