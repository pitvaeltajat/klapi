// single loan view
import React from 'react';
import Head from 'next/head';
import prisma from '../../utils/prisma';
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
  Text,
  Tag,
  useColorModeValue,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import NotAuthenticated from '../../components/NotAuthenticated';
import NextLink from 'next/link';
import ReservationTableLoanView from '../../components/ReservationTableLoanView';
import StartLoanConfirmation from '../../components/StartLoanConfirmation';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useSession } from 'next-auth/react';
import { Loan, User, Reservation, Item, Box as BoxType } from '@prisma/client';
import { GetServerSideProps } from 'next';
import {
  getLoanStatusLabel,
  getLoanStatusColor,
  deriveLoanStatus,
} from '../../utils/loanHelpers';
import { ReservationStatus } from '@prisma/client';

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
  if (!req.params?.id || typeof req.params.id !== 'string') {
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
  const {
    isOpen: isStartLoanOpen,
    onOpen: onStartLoanOpen,
    onClose: onStartLoanClose,
  } = useDisclosure();
  const { data: session } = useSession();
  const cardBg = useColorModeValue('white', 'gray.800');

  const isAdmin = session?.user?.group === 'ADMIN';

  const approveLoan = async () => {
    const body = { id: loan.id };
    await fetch('/api/loan/approveLoan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then(async () => {
        toast({
          title: 'Laina hyväksytty',
          description: 'Laina hyväksytty onnistuneesti',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        await fetch('/api/email/sendApproved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: loan.user.email,
            id: loan.id,
          }),
        });
        router.push('/loan');
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: err.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
    // navigate to all loans view
  };

  const rejectLoan = async () => {
    const body = { id: loan.id };
    await fetch('/api/loan/rejectLoan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then(() => {
        toast({
          title: 'Laina hylätty',
          description: 'Laina hylätty onnistuneesti',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        router.push('/loan');
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: err.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
  };

  const loanProcessed = async () => {
    const body = { id: loan.id };
    await fetch('/api/loan/loanProcessed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then(() => {
        toast({
          title: 'Kamat palautettu',
          description: 'Lainaus saatettu päätökseen',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        router.push('/loan');
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: err.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
  };

  const isKiosk = session?.user?.group === 'KIOSK';

  // Derive the loan status from reservations
  const derivedStatus = deriveLoanStatus(
    loan.reservations.map((r) => ({ status: r.status as ReservationStatus })),
  );

  //Check if user is allowed to see information about this loan
  // KIOSK users can view all loans in read-only mode
  if (!(session?.user?.group === 'ADMIN' || session?.user?.id === loan.user.id || isKiosk)) {
    return (
      <>
        <NotAuthenticated />
      </>
    );
  }

  // Determine which buttons to show based on derived status and user role
  const canReject =
    (isAdmin || session?.user?.id === loan.user.id) &&
    derivedStatus !== 'REJECTED' &&
    derivedStatus !== 'INUSE' &&
    derivedStatus !== 'RETURNED';

  const canEdit =
    (isAdmin || session?.user?.id === loan.user.id) &&
    derivedStatus !== 'INUSE' &&
    derivedStatus !== 'RETURNED';

  const canApprove =
    isAdmin &&
    derivedStatus !== 'ACCEPTED' &&
    derivedStatus !== 'INUSE' &&
    derivedStatus !== 'RETURNED';

  const canStartUse = derivedStatus === 'ACCEPTED';

  const canMarkReturned = isAdmin && (derivedStatus === 'INUSE' || derivedStatus === 'IN_BOX');

  // list reservations and show loan basic information and user information
  return (
    <>
      <Head>
        <title>Varaus: {loan.description || 'Ei kuvausta'} | Klapi</title>
      </Head>
      <Breadcrumbs
        items={[
          { label: 'Varaukset', href: '/loan' },
          { label: loan.description || 'Ei kuvausta' },
        ]}
      />
      <Stack spacing={6}>
        <Heading as="h1" mb={4}>
          Varaus: {loan.description || 'Ei kuvausta'}
        </Heading>

        <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px">
          <Heading as="h2" size="lg" mb={4}>
            Perustiedot
          </Heading>
          <Stack spacing={3}>
            <Text>
              Aloitusaika:{' '}
              {new Date(loan.startTime).toLocaleString('fi-FI', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </Text>
            <Text>
              Lopetusaika:{' '}
              {new Date(loan.endTime).toLocaleString('fi-FI', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </Text>
            <Text>Varaaja: {loan.user.name}</Text>
            {loan.loaner && <Text>Lainaaja: {loan.loaner}</Text>}
            {loan.box && <Text>Laatikko: {loan.box.name}</Text>}
            <Box>
              <Tag colorScheme={getLoanStatusColor(derivedStatus)} width="fit-content">
                {getLoanStatusLabel(derivedStatus)}
              </Tag>
            </Box>
          </Stack>
        </Box>

        <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px">
          <Heading as="h2" size="lg" mb={4}>
            Kamat
          </Heading>
          <ReservationTableLoanView loan={loan} />
        </Box>

        {/* Action buttons */}
        {derivedStatus === 'RETURNED' ? (
          <Box bg="green.50" p={6} borderRadius="lg" borderWidth="1px" borderColor="green.200">
            <Heading as="h2" size="md" color="green.700">
              Lainaustapahtuma suoritettu loppuun
            </Heading>
          </Box>
        ) : canMarkReturned ? (
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px">
            <Stack spacing={3}>
              <Heading as="h3" size="md" mb={2}>
                Toiminnot
              </Heading>
              <Button onClick={loanProcessed} colorScheme="green" size="lg" width="full">
                Merkitse kamat palautetuksi
              </Button>
            </Stack>
          </Box>
        ) : (
          (canReject || canEdit || canApprove || canStartUse) && (
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px">
              <Stack spacing={3}>
                <Heading as="h3" size="md" mb={2}>
                  Toiminnot
                </Heading>
                <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
                  {canReject && (
                    <Button colorScheme="red" onClick={onOpen} flex="1">
                      Hylkää
                    </Button>
                  )}
                  {canEdit && (
                    <Link as={NextLink} href={`/admin/editLoan/${loan.id}`} flex="1">
                      <Button colorScheme="yellow" width="full">
                        Muokkaa
                      </Button>
                    </Link>
                  )}
                  {canApprove && (
                    <Button colorScheme="green" onClick={approveLoan} flex="1">
                      Hyväksy
                    </Button>
                  )}
                  {canStartUse && (
                    <Button colorScheme="blue" onClick={onStartLoanOpen} flex="1">
                      Aloita lainaus
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          )
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

        <StartLoanConfirmation
          isOpen={isStartLoanOpen}
          onClose={onStartLoanClose}
          loan={loan}
        />
      </Stack>
    </>
  );
}
