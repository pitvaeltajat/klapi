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
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../components/NotAuthenticated';
import { Box as BoxType, Item, Reservation, Loan } from '@prisma/client';
import { GetServerSideProps } from 'next';

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
  reports: { id: string; content: string; createdAt: Date; loanId: string }[];
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
          status: {
            in: ['IN_BOX'],
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
    props: {
      boxes: JSON.parse(JSON.stringify(boxes)),
      reports: JSON.parse(JSON.stringify(reports)),
    },
  };
};

export default function BoxesPage({ boxes, reports }: BoxesPageProps) {
  const { data: session } = useSession();

  if (session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'green';
      case 'INUSE':
        return 'blue';
      case 'IN_BOX':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'Hyväksytty';
      case 'INUSE':
        return 'Käytössä';
      case 'IN_BOX':
        return 'Laatikossa';
      default:
        return status;
    }
  };

  const hasReports = (loanId: string) => {
    return reports.some((report) => report.loanId === loanId);
  };

  return (
    <>
      <Head>
        <title>Laatikot | Klapi</title>
      </Head>
      <Heading as="h1" size="xl" mb={6}>
        Laatikot
      </Heading>

      {boxes.length === 0 ? (
        <Box bg="gray.50" p={8} borderRadius="lg" textAlign="center" borderWidth="1px">
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
                bg="white"
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
                              bg="gray.50"
                              p={3}
                              borderRadius="md"
                              borderWidth="1px"
                              _hover={{
                                bg: 'gray.100',
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
                                  <Badge colorScheme={getStatusColor(loan.status)} fontSize="xs">
                                    {getStatusText(loan.status)}
                                  </Badge>
                                </HStack>
                                {hasReports(loan.id) && (
                                  <Badge colorScheme="red" fontSize="xs" alignSelf="flex-end">
                                    Sisältää raportin
                                  </Badge>
                                )}
                                <Text fontSize="xs" color="gray.600">
                                  {loan.reservations
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
