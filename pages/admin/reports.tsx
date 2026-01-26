import React from 'react';
import Head from 'next/head';
import prisma from '../../utils/prisma';
import {
  Heading,
  SimpleGrid,
  Box,
  Stack,
  Text,
  Link,
  Badge,
  VStack,
  HStack,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../components/NotAuthenticated';
import Breadcrumbs from '../../components/Breadcrumbs';
import { Box as BoxType, Item, Reservation, Loan, ReportAffectedItem } from '@prisma/client';
import { GetServerSideProps } from 'next';

interface ReportsPageProps {
  reports: {
    id: string;
    content: string;
    createdAt: Date;
    created: string;
    loanId: string;
    status: string;
    loan: Loan & {
      reservations: (Reservation & {
        item: Item;
      })[];
      box: BoxType;
      user: {
        name: string;
      };
    };
    affectedItems: (ReportAffectedItem & { item: Item })[];
  }[];
}

export const getServerSideProps: GetServerSideProps<ReportsPageProps> = async () => {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      loan: {
        include: {
          reservations: {
            include: {
              item: true,
            },
          },
          box: true,
          user: true,
        },
      },
      affectedItems: {
        include: { item: true },
      },
    },
  });

  return {
    props: {
      reports: JSON.parse(JSON.stringify(reports)),
    },
  };
};

export default function ReportsPage({ reports }: ReportsPageProps) {
  const { data: session } = useSession();
  const emptyBg = useColorModeValue('gray.50', 'gray.700');

  if (session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('fi-FI', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Head>
        <title>Raportit | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Raportit' }]} />
      <Heading as="h1" size="xl" mb={6}>
        Raportit
      </Heading>

      {reports.length === 0 ? (
        <Box p={6} bg={emptyBg} borderRadius="md" textAlign="center">
          <Text color="gray.600">Ei raportteja</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {reports.map((report) => (
          <Box key={report.id} p={5} shadow="md" borderWidth="1px" borderRadius="md">
            <VStack align="start" spacing={3}>
              <HStack justify="space-between" width="100%">
                <Text fontSize="lg" fontWeight="bold">
                  Raportti ID: {report.id}
                </Text>
                <Badge
                  colorScheme={
                    report.status === 'IN_PROGRESS'
                      ? 'yellow'
                      : report.status === 'RESOLVED'
                        ? 'green'
                        : 'gray'
                  }
                >
                  {report.status === 'IN_PROGRESS'
                    ? 'Käsittelyssä'
                    : report.status === 'RESOLVED'
                      ? 'Ratkaistu'
                      : 'Käsittelemättä'}
                </Badge>
              </HStack>
              <Divider />
              <Text>
                <strong>Luotu:</strong> {formatDate(new Date(report.createdAt))}
                {report.created === 'AFTER_LOAN' ? ' (Lainauksen jälkeen)' : ' (Ennen lainausta)'}
              </Text>
              <Text>
                <strong>Sisältö:</strong>{' '}
                {report.content.length > 200
                  ? report.content.substring(0, 200) + '...'
                  : report.content}
              </Text>
              {report.affectedItems.length > 0 && (
                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Kamat joihin raportti vaikuttaa:
                  </Text>
                  <Stack as="ul" pl={4} spacing={1}>
                    {report.affectedItems.map((item) => (
                      <Box as="li" key={item.id}>
                        {item.item.name} - Määrä: {item.amount}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
              <VStack align="start" spacing={1}>
                <Link as={NextLink} href={`/loan/${report.loanId}`} color="teal.500">
                  Liittyy {report.loan.loaner || report.loan.user.name} tekemään lainaan{' '}
                  {report.loan.description}
                </Link>
              </VStack>
            </VStack>
          </Box>
        ))}
        </SimpleGrid>
      )}
    </>
  );
}
