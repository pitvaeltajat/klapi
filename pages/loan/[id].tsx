// single loan view
import React from "react";
import prisma from "../../utils/prisma";
import {
  Stack,
  Button,
  Heading,
  Box,
  useToast,
  useDisclosure,
  Link,
  Container,
  Text,
  Tag,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import NotAuthenticated from "../../components/NotAuthenticated";
import NextLink from "next/link";
import ReservationTableLoanView from "../../components/ReservationTableLoanView";
import { useSession } from "next-auth/react";
import {
  Loan,
  User,
  Reservation,
  Item,
  LoanStatus,
  Box as BoxType,
} from "@prisma/client";
import { GetServerSideProps } from "next";
import { getColor } from "./index";
import {
  cardStyles,
  headingSizes,
  spacing,
  containerMaxWidth,
  buttonColors,
} from "@/styles/designTokens";

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

  const isAdmin = session?.user?.group === "ADMIN";

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

  const _loanToUse = async () => {
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

  const loanProcessed = async () => {
    const body = { id: loan.id };
    await fetch("/api/loan/loanProcessed", {
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
    <Container maxW={containerMaxWidth} {...spacing.containerPadding}>
      <Stack gap={spacing.sectionSpacing}>
        <Heading
          as="h1"
          size={headingSizes.pageTitle}
          mb={spacing.elementSpacing}
        >
          Varaus: {loan.description || "Ei kuvausta"}
        </Heading>

        <Box {...cardStyles.base}>
          <Heading
            as="h2"
            size={headingSizes.sectionTitle}
            mb={spacing.elementSpacing}
          >
            Perustiedot
          </Heading>
          <Stack gap={spacing.tightSpacing}>
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

        <Box {...cardStyles.base}>
          <Heading
            as="h2"
            size={headingSizes.sectionTitle}
            mb={spacing.elementSpacing}
          >
            Kamat
          </Heading>
          <ReservationTableLoanView loan={loan} />
        </Box>

        {loan.status !== "INUSE" && loan.status !== "RETURNED" && (
          <Stack direction="row" spacing={spacing.elementSpacing}>
            {(isAdmin || session?.user?.id === loan.user.id) && (
              <Button
                colorScheme={buttonColors.danger}
                onClick={onOpen}
                isDisabled={loan.status === "REJECTED"}
              >
                Hylkää
              </Button>
            )}
            {isAdmin && (
              <>
                <Link as={NextLink} href={`/admin/editLoan/${loan.id}`}>
                  <Button colorScheme={buttonColors.secondary}>Muokkaa</Button>
                </Link>
                <Button
                  colorScheme={buttonColors.success}
                  onClick={approveLoan}
                  isDisabled={loan.status === "ACCEPTED"}
                >
                  Hyväksy
                </Button>
              </>
            )}
          </Stack>
        )}

        {(loan.status === "IN_BOX" || loan.status === "INUSE") && isAdmin && (
          <Stack direction="row" spacing={spacing.elementSpacing}>
            <Button onClick={loanProcessed} colorScheme={buttonColors.success}>
              Merkitse kamat palautetuksi
            </Button>
          </Stack>
        )}

        {loan.status === "RETURNED" && (
          <Box {...cardStyles.base}>
            <Heading as="h2" size={headingSizes.sectionTitle}>
              Lainaustapahtuma suoritettu loppuun
            </Heading>
          </Box>
        )}

        <Dialog.Root
          open={isOpen}
          onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
        >
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Hylätäänkö varaus?</Dialog.Title>
                <Dialog.CloseTrigger />
              </Dialog.Header>
              <Dialog.Body>Varaushakemus hylätään. Oletko varma?</Dialog.Body>

              <Dialog.Footer>
                <Button
                  colorScheme={buttonColors.danger}
                  mr={3}
                  onClick={rejectLoan}
                >
                  Hylkää
                </Button>
                <Button colorScheme={buttonColors.secondary} onClick={onClose}>
                  Peruuta
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </Stack>
    </Container>
  );
}
