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
import ReportCard from '../../components/ReportCard';

interface Report {
  id: string;
  content: string;
  createdAt: string | Date;
  status: string;
}
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

import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';

export async function getServerSideProps(
  req: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<{ loan: LoanWithRelations; reports: Report[] }>> {
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

  const reports = await prisma.report.findMany({
    where: {
      loanId: req.params.id,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      status: true,
    },
  });

  if (!loan) {
    return { notFound: true };
  }

  return {
    props: {
      loan,
      reports,
    },
  };
}

export default function LoanView({
  loan,
  reports,
}: {
  loan: LoanWithRelations;
  reports: Report[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [expandedReportId, setExpandedReportId] = React.useState<string | null>(null);
  const [affectedItems, setAffectedItems] = React.useState<{ [key: string]: number }>({});
  const [announcement, setAnnouncement] = React.useState<{ itemId: string; content: string }>({
    itemId: '',
    content: '',
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isStartLoanOpen,
    onOpen: onStartLoanOpen,
    onClose: onStartLoanClose,
  } = useDisclosure();
  const { data: session } = useSession();
  const cardBg = useColorModeValue('white', 'gray.800');

  const isAdmin = session?.user?.group === 'ADMIN';

  // API-funktiot
  const approveLoan = async () => {
    await fetch('/api/loan/approveLoan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: loan.id }),
    });
    toast({ title: 'Laina hyväksytty', status: 'success', duration: 5000, isClosable: true });
    router.push('/loan');
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
    await fetch('/api/loan/loanProcessed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: loan.id }),
    });
    toast({ title: 'Kamat palautettu', status: 'success', duration: 5000, isClosable: true });
    router.push('/loan');
  };

  // Raporttien API-funktiot
  const setReportToProcessing = async (
    reportId: string,
    affectedItems?: { [key: string]: number },
  ) => {
    await fetch('/api/loan/editReport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reportId, status: 'IN_PROGRESS', affectedItems }),
    });
    toast({
      title: 'Raportti otettu käsittelyyn',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    router.replace(router.asPath);
  };
  const resolveReport = async (reportId: string, affectedItems?: { [key: string]: number }) => {
    await fetch('/api/loan/editReport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reportId, status: 'RESOLVED', affectedItems }),
    });
    toast({
      title: 'Raportti merkitty käsitellyksi',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    router.replace(router.asPath);
  };
  const sendAnnouncement = async (itemId: string, content: string) => {
    await fetch('/api/item/createAnnouncement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement: { itemId, message: content } }),
    });
    toast({ title: 'Ilmoitus lähetetty', status: 'success', duration: 5000, isClosable: true });
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
  const canSeeReports = isAdmin && reports.length > 0;

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
            <Text>Lainaaja: {loan.loaner || loan.user.name || loan.user.email}</Text>
            {loan.loaner && loan.user.name && loan.loaner !== loan.user.name && (
              <Text>Tili: {loan.user.name}</Text>
            )}
            {loan.box && <Text>Laatikko: {loan.box.name}</Text>}
            <Box>
              <Tag colorScheme={getLoanStatusColor(derivedStatus)} width="fit-content">
                {getLoanStatusLabel(derivedStatus)}
              </Tag>
              {reports.length > 0 && (
                <Tag colorScheme="red" size="md" flexShrink={0} ml={2}>
                  Käsittelemättömiä raportteja:{' '}
                  {reports.filter((r) => r.status !== 'RESOLVED').length}
                </Tag>
              )}
            </Box>
          </Stack>
        </Box>

        <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px">
          <Heading as="h2" size="lg" mb={4}>
            Kamat
          </Heading>
          <ReservationTableLoanView loan={loan} />
        </Box>
        {canSeeReports && (
          <ReportCard
            reports={reports}
            loan={loan}
            expandedReportId={expandedReportId}
            setExpandedReportId={setExpandedReportId}
            announcement={announcement}
            setAnnouncement={setAnnouncement}
            affectedItems={affectedItems}
            setAffectedItems={setAffectedItems}
            onSetProcessing={setReportToProcessing}
            onSetResolved={resolveReport}
            onSendAnnouncement={sendAnnouncement}
          />
        )}
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
