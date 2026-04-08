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
import { Box as BoxType, Item, Reservation, Loan, ReservationStatus } from '@prisma/client';
import { deriveLoanStatus, getLoanStatusLabel, getLoanStatusColor } from '../../utils/loanHelpers';
import { GetServerSideProps } from 'next';
import { serialize } from '@/utils/serialize';

interface LoanWithReservations extends Loan {
  reservations: (Reservation & {
    item: Item;
  })[];
}

interface BoxWithLoans extends BoxType {
  loans: LoanWithReservations[];
}

interface BoxesPageProps {
  boxes: BoxWithLoans[];
  reports: { id: string; content: string; createdAt: Date; loanId: string; status: string }[];
}

export const getServerSideProps: GetServerSideProps<BoxesPageProps> = async () => {
  const boxes = await prisma.box.findMany({
    include: {
      loans: {
        include: {
          reservations: {
            include: {
              item: true,
            },
          },
        },
        where: {
          // Get loans that have at least one IN_BOX reservation
          reservations: {
            some: {
              status: ReservationStatus.IN_BOX,
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const reports = await prisma.report.findMany();

  return {
    props: serialize({
      boxes,
      reports,
    }),
  };
};

export default function BoxesPage({ boxes, reports }: BoxesPageProps) {
  const { data: session } = useSession();
  const emptyBg = useColorModeValue('gray.50', 'gray.700');
  const cardBg = useColorModeValue('white', 'gray.800');
  const loanItemBg = useColorModeValue('gray.50', 'gray.700');
  const loanItemHoverBg = useColorModeValue('gray.100', 'gray.600');

  if (session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  // Helper to get derived status for a loan
  const getDerivedStatus = (loan: LoanWithReservations) => {
    return deriveLoanStatus(loan.reservations, loan.status);
  };

  // Only count unresolved reports
  const hasReports = (loanId: string) => {
    return reports.some((report) => report.loanId === loanId && report.status !== 'RESOLVED');
  };

  return (
    <>
      <Head>
        <title>Laatikot | Klapi</title>
      </Head>
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Laatikot' },
        ]}
      />
      <Heading as="h1" size="xl" mb={6}>
        Laatikot
      </Heading>

      {boxes.length === 0 ? (
        <Box bg={emptyBg} p={8} borderRadius="lg" textAlign="center" borderWidth="1px">
          <Text fontSize="lg" color="gray.600">
            Ei laatikkoja
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {boxes.map((box) => {
            return (
              <Box
                key={box.id}
                bg={cardBg}
                borderWidth="2px"
                borderRadius="xl"
                p={6}
                shadow="md"
                _hover={{
                  shadow: 'lg',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s',
                }}
              >
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Heading as="h2" size="md" mb={2}>
                      {box.name}
                    </Heading>
                    {box.description && (
                      <Text fontSize="sm" color="gray.600">
                        {box.description}
                      </Text>
                    )}
                  </Box>

                  <Divider />

                  <Box>
                    <HStack justify="space-between" mb={3}>
                      <Text fontWeight="semibold" fontSize="sm" color="gray.700">
                        Varaukset
                      </Text>
                      <Badge colorScheme="blue">{box.loans.length}</Badge>
                    </HStack>

                    {box.loans.length === 0 ? (
                      <Text fontSize="sm" color="gray.500" fontStyle="italic">
                        Ei varauksia
                      </Text>
                    ) : (
                      <Stack spacing={3}>
                        {box.loans.map((loan) => (
                          <Link
                            key={loan.id}
                            as={NextLink}
                            href={`/loan/${loan.id}`}
                            _hover={{ textDecoration: 'none' }}
                          >
                            <Box
                              bg={loanItemBg}
                              p={3}
                              borderRadius="md"
                              borderWidth="1px"
                              _hover={{
                                bg: loanItemHoverBg,
                                borderColor: 'blue.300',
                                shadow: 'sm',
                              }}
                              transition="all 0.2s"
                            >
                              <VStack align="stretch" spacing={2}>
                                <HStack justify="space-between">
                                  <Text fontWeight="medium" fontSize="sm">
                                    {loan.description || 'Ei kuvausta'}
                                  </Text>
                                  <Badge
                                    colorScheme={getLoanStatusColor(getDerivedStatus(loan))}
                                    fontSize="xs"
                                  >
                                    {getLoanStatusLabel(getDerivedStatus(loan))}
                                  </Badge>
                                </HStack>
                                {hasReports(loan.id) && (
                                  <Badge colorScheme="red" fontSize="xs" alignSelf="flex-end">
                                    Raportteja:{' '}
                                    {
                                      reports.filter(
                                        (report) =>
                                          report.loanId === loan.id && report.status !== 'RESOLVED',
                                      ).length
                                    }
                                  </Badge>
                                )}
                                <Text fontSize="xs" color="gray.600">
                                  {loan.reservations
                                    .filter((r) => r.status === ReservationStatus.IN_BOX)
                                    .map((r) => `${r.item.name} (${r.amount})`)
                                    .join(', ')}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {new Date(loan.startTime).toLocaleDateString('fi-FI')} -{' '}
                                  {new Date(loan.endTime).toLocaleDateString('fi-FI')}
                                </Text>
                              </VStack>
                            </Box>
                          </Link>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </>
  );
}
