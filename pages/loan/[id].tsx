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
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import NotAuthenticated from '../../components/NotAuthenticated';
import NextLink from 'next/link';
import ReservationTableLoanView from '../../components/ReservationTableLoanView';
import ReportCard from '../../components/ReportCard';
import { useSession } from 'next-auth/react';
import { Loan, User, Reservation, Item, Box as BoxType } from '@prisma/client';

interface Report {
  id: string;
  content: string;
  createdAt: string | Date;
  status: string;
}
import { getLoanStatusLabel, getLoanStatusColor } from '../../utils/loanHelpers';

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
  const { onOpen } = useDisclosure();
  const [expandedReportId, setExpandedReportId] = React.useState<string | null>(null);
  const { data: session } = useSession();
  const [affectedItems, setAffectedItems] = React.useState<{ [key: string]: number }>({});
  const [announcement, setAnnouncement] = React.useState<{ itemId: string; content: string }>({
    itemId: '',
    content: '',
  });
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

  // Removed unused rejectLoan

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

  //Check if user is allowed to see information about this loan
  if (!(session?.user?.group === 'ADMIN' || session?.user?.id === loan.user.id)) {
    return <NotAuthenticated />;
  }

  // Determine which buttons to show based on loan status and user role
  const canReject =
    (isAdmin || session?.user?.id === loan.user.id) &&
    loan.status !== 'REJECTED' &&
    loan.status !== 'INUSE' &&
    loan.status !== 'RETURNED';
  const canEdit = isAdmin && loan.status !== 'INUSE' && loan.status !== 'RETURNED';
  const canApprove =
    isAdmin && loan.status !== 'ACCEPTED' && loan.status !== 'INUSE' && loan.status !== 'RETURNED';
  const canMarkReturned = isAdmin && (loan.status === 'INUSE' || loan.status === 'IN_BOX');
  const canSeeReports = isAdmin && reports.length > 0;

  return (
    <>
      <Head>
        <title>Varaus: {loan.description || 'Ei kuvausta'} | Klapi</title>
      </Head>
      <Stack spacing={6}>
        <Heading as="h1" mb={4}>
          Varaus: {loan.description || 'Ei kuvausta'}
        </Heading>
        <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
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
              <Tag colorScheme={getLoanStatusColor(loan.status)} width="fit-content">
                {getLoanStatusLabel(loan.status)}
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
        <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
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
        {loan.status === 'RETURNED' ? (
          <Box bg="green.50" p={6} borderRadius="lg" borderWidth="1px" borderColor="green.200">
            <Heading as="h2" size="md" color="green.700">
              ✓ Lainaustapahtuma suoritettu loppuun
            </Heading>
          </Box>
        ) : canMarkReturned ? (
          <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
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
          (canReject || canEdit || canApprove) && (
            <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
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
                </Stack>
              </Stack>
            </Box>
          )
        )}
      </Stack>
    </>
  );
}
