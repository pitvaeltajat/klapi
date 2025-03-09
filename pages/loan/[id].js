// single loan view
import React from "react";
import prisma from "/utils/prisma";
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
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import NotAuthenticated from "../../components/NotAuthenticated";
import NextLink from "next/link";
import ReservationTableLoanView from "../../components/ReservationTableLoanView";
import { useSession } from "next-auth/react";

export async function getServerSideProps(req, res) {
  const loan = await prisma.loan.findUnique({
    where: {
      id: req.params.id,
    },
    include: {
      user: true,
      reservations: {
        include: {
          item: true,
        },
      },
    },
  });
  if (!loan) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      loan,
    },
  };
}

export default function LoanView({ loan }) {
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
      .then(async (data) => {
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
      .then((data) => {
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
      .then((data) => {
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
      .then((data) => {
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
    <>
      <Heading as="h1">Varaus: {loan.description || "Ei kuvausta"}</Heading>
      <Heading as="h2" size="lg">
        Perustiedot
      </Heading>
      <Stack direction="column" spacing={4}>
        <Box>
          <p>Aloitusaika: {loan.startTime.toLocaleString("fi-FI")}</p>
          <p>Lopetusaika: {loan.endTime.toLocaleString("fi-FI")}</p>
          <p>Varaaja: {loan.user.name}</p>
          <p>
            Status:{" "}
            {loan.status === "APPROVED"
              ? "Hyväksytty"
              : loan.status === "REJECTED"
              ? "Hylätty"
              : loan.status === "INUSE"
              ? "Käytössä"
              : loan.status === "RETURNED"
              ? "Palautettu"
              : "Odottaa käsittelyä"}
          </p>
        </Box>
      </Stack>
      <Heading as="h2" size="lg">
        Kamat
      </Heading>
      <ReservationTableLoanView loan={loan} />

      <Stack
        direction={"row"}
        padding="0.5em"
        gap="10"
        display={
          loan.status === "INUSE" || loan.status === "RETURNED"
            ? "none"
            : "block"
        }
      >
        {session?.user?.group === "ADMIN" ||
        session?.user?.id === loan.user.id ? (
          <Button
            colorScheme={"red"}
            onClick={onOpen}
            isDisabled={loan.status === "REJECTED"}
          >
            Hylkää
          </Button>
        ) : null}
        {session?.user?.group === "ADMIN" ? (
          <>
            <Link as={NextLink} href={`/admin/editLoan/${loan.id}`}>
              <Button colorScheme={"yellow"}>Muokkaa</Button>
            </Link>
            <Button
              colorScheme={"green"}
              onClick={approveLoan}
              isDisabled={loan.status === "ACCEPTED"}
            >
              Hyväksy
            </Button>
          </>
        ) : null}

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
      <Stack
        direction="row"
        padding="0.5em"
        display={
          (loan.status === "ACCEPTED" || loan.status === "INUSE") &&
          session?.user?.group === "ADMIN"
            ? "block"
            : "none"
        }
      >
        <Button isDisabled={loan.status === "INUSE"} onClick={loanToUse}>
          Merkitse kamat annetuksi
        </Button>
        <Button isDisabled={loan.status !== "INUSE"} onClick={loanReturned}>
          Merkitse kamat palautetuksi
        </Button>
      </Stack>

      <Heading
        as="h2"
        size="lg"
        display={loan.status === "RETURNED" ? "block" : "none"}
      >
        Lainaustapahtuma suoritettu loppuun
      </Heading>
    </>
  );
}
