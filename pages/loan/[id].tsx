// single loan view
import React from "react";
import prisma from "../../utils/prisma";
import {
  Stack,
  Button,
  Heading,
  Box,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Link,
  Container,
  Text,
  Tag,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import NotAuthenticated from "../../components/NotAuthenticated";
import NextLink from "next/link";
import ReservationTableLoanView from "../../components/ReservationTableLoanView";
import { useSession } from "next-auth/react";
import { Loan, User, Reservation, Item, LoanStatus, Box as BoxType } from "@prisma/client";
import { GetServerSideProps } from "next";
import { getColor } from "./index";

interface LoanWithRelations extends Loan {
  user: User;
  box: BoxType | null;
  reservations: (Reservation & {
    item: Item;
  })[];
}

export const getServerSideProps: GetServerSideProps<{
  loan: LoanWithRelations;
}> = async (req) => {
  if (!req.params?.id || typeof req.params.id !== "string") {
    return { notFound: true };
  }

  const loan = await prisma.loan.findUnique({
    where: {
      id: req.params.id,
    },
    include: {
      user: true,
      box: true,
      reservations: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!loan) {
    return { notFound: true };
  }

  return {
    props: {
      loan: JSON.parse(JSON.stringify(loan)),
    },
  };
};

export default function LoanView({ loan }: { loan: LoanWithRelations }) {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { data: session } = useSession();

  const approveLoan = async () => {
    const body = { id: loan.id };
    await fetch("/api/loan/approveLoan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then(async () => {
        toast({
          title: "Laina hyväksytty",
          description: "Laina hyväksytty onnistuneesti",
          status: "success",
          duration: 5000,
          isClosable: true,
        });

        await fetch("/api/email/sendApproved", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: loan.user.email,
            id: loan.id,
          }),
        });
        router.push("/loan");
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: err.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      });
    // navigate to all loans view
  };

  const rejectLoan = async () => {
    const body = { id: loan.id };
    await fetch("/api/loan/rejectLoan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then(() => {
        toast({
          title: "Laina hylätty",
          description: "Laina hylätty onnituneesti",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        router.push("/loan");
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: err.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      });
  };

  const loanToUse = async () => {
    const body = { id: loan.id };
    await fetch("/api/loan/loanToUse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then(() => {
        toast({
          title: "Lainan status päivitetty onnistuneesti",
          description: "Kamat ovat maailmalla",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        router.push("/loan");
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: err.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      });
  };

  const loanReturned = async () => {
    const body = { id: loan.id };
    await fetch("/api/loan/loanReturned", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then(() => {
        toast({
          title: "Kamat palautettu",
          description: "Lainaus saatettu päätökseen",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        router.push("/loan");
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: err.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      });
  };

  //Check if user is allowed to see information about this loan
  if (
    !(session?.user?.group === "ADMIN" || session?.user?.id === loan.user.id)
  ) {
    return (
      <>
        <NotAuthenticated />
      </>
    );
  }

  // first, double-check that the user really wants to reject the loan with a modal

  // list reservations and show loan basic information and user information
  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        <Heading as="h1" mb={4}>
          Varaus: {loan.description || "Ei kuvausta"}
        </Heading>

        <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
          <Heading as="h2" size="lg" mb={4}>
            Perustiedot
          </Heading>
          <Stack spacing={3}>
            <Text>
              Aloitusaika:{" "}
              {new Date(loan.startTime).toLocaleString("fi-FI", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </Text>
            <Text>
              Lopetusaika:{" "}
              {new Date(loan.endTime).toLocaleString("fi-FI", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </Text>
            <Text>Varaaja: {loan.user.name}</Text>
            {loan.loaner && <Text>Lainaaja: {loan.loaner}</Text>}
            {loan.box && <Text>Laatikko: {loan.box.name}</Text>}
            <Box>
              <Tag colorScheme={getColor(loan.status)} width="fit-content">
                {loan.status === LoanStatus.ACCEPTED
                  ? "Hyväksytty"
                  : loan.status === LoanStatus.REJECTED
                  ? "Hylätty"
                  : loan.status === LoanStatus.INUSE
                  ? "Käytössä"
                  : loan.status === LoanStatus.IN_BOX
                  ? "Laatikossa"
                  : loan.status === LoanStatus.RETURNED
                  ? "Palautettu"
                  : "Tuntematon"}
              </Tag>
            </Box>
          </Stack>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
          <Heading as="h2" size="lg" mb={4}>
            Kamat
          </Heading>
          <ReservationTableLoanView loan={loan} />
        </Box>

        {loan.status !== "INUSE" && loan.status !== "RETURNED" && (
          <Stack direction="row" spacing={4}>
            {(session?.user?.group === "ADMIN" ||
              session?.user?.id === loan.user.id) && (
              <Button
                colorScheme="red"
                onClick={onOpen}
                isDisabled={loan.status === "REJECTED"}
              >
                Hylkää
              </Button>
            )}
            {session?.user?.group === "ADMIN" && (
              <>
                <Link as={NextLink} href={`/admin/editLoan/${loan.id}`}>
                  <Button colorScheme="yellow">Muokkaa</Button>
                </Link>
                <Button
                  colorScheme="green"
                  onClick={approveLoan}
                  isDisabled={loan.status === "ACCEPTED"}
                >
                  Hyväksy
                </Button>
              </>
            )}
          </Stack>
        )}

        {loan.status === "IN_BOX" && session?.user?.group === "ADMIN" && (
          <Stack direction="row" spacing={4}>
            <Button onClick={loanReturned} colorScheme="green">
              Merkitse kamat palautetuksi
            </Button>
          </Stack>
        )}

        {loan.status === "RETURNED" && (
          <Box bg="gray.50" p={6} borderRadius="lg" borderWidth="1px">
            <Heading as="h2" size="lg">
              Lainaustapahtuma suoritettu loppuun
            </Heading>
          </Box>
        )}

        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Hylätäänkö varaus?</ModalHeader>
            <ModalCloseButton />
            <ModalBody>Varaushakemus hylätään. Oletko varma?</ModalBody>

            <ModalFooter>
              <Button colorScheme="red" mr={3} onClick={rejectLoan}>
                Hylkää
              </Button>
              <Button colorScheme="gray" onClick={onClose}>
                Peruuta
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Stack>
    </Container>
  );
}
