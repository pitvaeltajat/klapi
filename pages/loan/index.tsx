import { LoanStatus, ReservationStatus } from '@prisma/client';
import Head from 'next/head';
import {
  Box,
  Button,
  Checkbox,
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
  useColorModeValue,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import useSWR from 'swr';
import NotAuthenticated from '../../components/NotAuthenticated';
import LoadingSpinner from '../../components/LoadingSpinner';
import Breadcrumbs from '../../components/Breadcrumbs';
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
    };
  }[];
}

export const LoanCard = ({ loan }: { loan: LoanType }) => {
  const cardBg = useColorModeValue('white', 'gray.800');

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
      bg={cardBg}
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

const getStatusFilterLabel = (status: LoanStatus): string => {
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
  const allStatuses = Object.values(LoanStatus);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<LoanStatus>>(
    new Set([LoanStatus.ACCEPTED, LoanStatus.IN_BOX, LoanStatus.INUSE]),
  );

  const allChecked = selectedStatuses.size === allStatuses.length;
  const isIndeterminate = selectedStatuses.size > 0 && !allChecked;

  if (!session?.user) {
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

  const toggleAllStatuses = () => {
    if (allChecked || isIndeterminate) {
      setSelectedStatuses(new Set());
    } else {
      setSelectedStatuses(new Set(allStatuses));
    }
  };

  const toggleStatus = (status: LoanStatus) => {
    const newStatuses = new Set(selectedStatuses);
    if (newStatuses.has(status)) {
      newStatuses.delete(status);
    } else {
      newStatuses.add(status);
    }
    setSelectedStatuses(newStatuses);
  };

  const filteredLoans = sortedLoans.filter((loan) => {
    if (selectedStatuses.size === 0) {
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
      <Breadcrumbs items={[{ label: 'Varaukset' }]} />
      <Stack spacing={8}>
        <Box>
          <Heading mb={4}>Varaukset</Heading>
          <Box py={4}>
            <Stack spacing={3}>
              <Checkbox
                isChecked={allChecked}
                isIndeterminate={isIndeterminate}
                onChange={toggleAllStatuses}
                colorScheme="blue"
                fontWeight="medium"
              >
                Kaikki
              </Checkbox>
              <Stack pl={6} spacing={2}>
                {allStatuses.map((status) => (
                  <Checkbox
                    key={status}
                    isChecked={selectedStatuses.has(status)}
                    onChange={() => toggleStatus(status)}
                    colorScheme="blue"
                  >
                    {getStatusFilterLabel(status)}
                  </Checkbox>
                ))}
              </Stack>
            </Stack>
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
