import { LoanStatus, ReservationStatus } from '@prisma/client';
import Head from 'next/head';
import {
  Box,
  Button,
  Heading,
  Link,
  Stack,
  Tag,
  Text,
  Wrap,
  WrapItem,
  HStack,
  VStack,
  SimpleGrid,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import useSWR from 'swr';
import NotAuthenticated from '../../components/NotAuthenticated';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getLoanStatusLabel, getLoanStatusColor, deriveLoanStatus } from '../../utils/loanHelpers';

interface LoanType {
  id: string;
  userId: string;
  status: LoanStatus;
  description: string | null;
  startTime: Date;
  endTime: Date;
  user: {
    name: string | null;
    email: string | null;
  };
  reservations: {
    status: ReservationStatus;
    item: {
      id: string;
      name: string;
      image: string | null;
    };
  }[];
}

export const LoanCard = ({ loan }: { loan: LoanType }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('fi-FI', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Derive the loan status from reservations
  const derivedStatus = deriveLoanStatus(loan.reservations);

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      p={4}
      bg="white"
      boxShadow="sm"
      height="100%"
    >
      <VStack spacing={3} align="stretch" height="100%">
        <HStack justifyContent="space-between" alignItems="start">
          <VStack align="start" spacing={1} flex={1}>
            <Heading size="md">
              <Link as={NextLink} href={`/loan/${loan.id}`}>
                {loan.description || loan.user.name}
              </Link>
            </Heading>
            <Text fontSize="sm" color="gray.600">
              Varaaja: {loan.user.name}
            </Text>
          </VStack>
          <Tag colorScheme={getLoanStatusColor(derivedStatus)} size="md" flexShrink={0}>
            {getLoanStatusLabel(derivedStatus)}
          </Tag>
        </HStack>

        <VStack spacing={2} fontSize="sm" color="gray.600" align="stretch">
          <Text>
            <Text as="span" fontWeight="medium">
              Alku:
            </Text>{' '}
            {formatDate(loan.startTime)}
          </Text>
          <Text>
            <Text as="span" fontWeight="medium">
              Loppu:
            </Text>{' '}
            {formatDate(loan.endTime)}
          </Text>
        </VStack>

        {loan.reservations.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
              Kamat ({loan.reservations.length}):
            </Text>
            <Wrap spacing={2}>
              {loan.reservations.slice(0, 5).map((reservation) => (
                <WrapItem key={reservation.item.id}>
                  <Tag size="sm" variant="subtle" colorScheme="blue">
                    {reservation.item.name}
                  </Tag>
                </WrapItem>
              ))}
              {loan.reservations.length > 5 && (
                <WrapItem>
                  <Tag size="sm" variant="subtle" colorScheme="gray">
                    +{loan.reservations.length - 5} lisää
                  </Tag>
                </WrapItem>
              )}
            </Wrap>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

const getStatusFilterLabel = (status: LoanStatus | 'ALL'): string => {
  if (status === 'ALL') {
    return 'Kaikki';
  }
  const label = getLoanStatusLabel(status);
  if (label === 'Hyväksytty') return 'Hyväksytyt';
  if (label === 'Hylätty') return 'Hylätyt';
  if (label === 'Palautettu') return 'Palautetut';
  return label;
};

function compareDates(dateA: Date, dateB: Date) {
  return dateB.getTime() - dateA.getTime();
}

export default function LoanList() {
  const { data: session } = useSession();
  const { data: loans, error, isLoading } = useSWR<LoanType[]>('/api/loan/getLoansClient');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<LoanStatus | 'ALL'>>(
    new Set([LoanStatus.IN_BOX, LoanStatus.INUSE]),
  );

  if (session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  if (isLoading) {
    return <LoadingSpinner fullWidth />;
  }

  if (error) {
    return <Text color="red.500">Virhe ladattaessa varauksia</Text>;
  }

  if (!loans || loans.length === 0) {
    return (
      <Box>
        <Heading>Ei varauksia</Heading>
        <Link as={NextLink} href="/">
          <Button>Luo varaus etusivulla</Button>
        </Link>
      </Box>
    );
  }

  const sortedLoans = [...loans].sort((a, b) =>
    compareDates(new Date(a.startTime), new Date(b.startTime)),
  );

  const toggleStatus = (status: LoanStatus | 'ALL') => {
    const newStatuses = new Set(selectedStatuses);

    if (status === 'ALL') {
      if (newStatuses.has('ALL')) {
        newStatuses.clear();
        newStatuses.add(LoanStatus.IN_BOX);
        newStatuses.add(LoanStatus.INUSE);
      } else {
        newStatuses.clear();
        newStatuses.add('ALL');
      }
    } else {
      if (newStatuses.has('ALL')) {
        newStatuses.clear();
      }

      if (newStatuses.has(status)) {
        newStatuses.delete(status);
        if (newStatuses.size === 0) {
          newStatuses.add('ALL');
        }
      } else {
        newStatuses.add(status);
      }
    }

    setSelectedStatuses(newStatuses);
  };

  const filteredLoans = sortedLoans.filter((loan) => {
    if (selectedStatuses.has('ALL')) {
      return true;
    }
    // Use derived status for filtering
    const derivedStatus = deriveLoanStatus(loan.reservations);
    return selectedStatuses.has(derivedStatus);
  });

  return (
    <>
      <Head>
        <title>Varaukset | Klapi</title>
      </Head>
      <Stack spacing={8}>
        <Box>
          <Heading mb={4}>Varaukset</Heading>
          <Box padding="2em" paddingLeft={0}>
            <Wrap padding="4px">
              <WrapItem key="all">
                <Button
                  onClick={() => toggleStatus('ALL')}
                  variant={selectedStatuses.has('ALL') ? 'solid' : 'outline'}
                  colorScheme={selectedStatuses.has('ALL') ? 'blue' : 'gray'}
                >
                  {getStatusFilterLabel('ALL')}
                </Button>
              </WrapItem>
              {Object.values(LoanStatus).map((status) => (
                <WrapItem key={status}>
                  <Button
                    onClick={() => toggleStatus(status)}
                    variant={selectedStatuses.has(status) ? 'solid' : 'outline'}
                    colorScheme={selectedStatuses.has(status) ? 'blue' : 'gray'}
                  >
                    {getStatusFilterLabel(status)}
                  </Button>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {filteredLoans.map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </SimpleGrid>
        </Box>
      </Stack>
    </>
  );
}
