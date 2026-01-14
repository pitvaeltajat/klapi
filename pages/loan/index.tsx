import { LoanStatus } from "@prisma/client";
import prisma from "../../utils/prisma";
import {
  Box,
  Button,
  Container,
  Heading,
  Link,
  Select,
  Stack,
  Tag,
  Text,
  Wrap,
  WrapItem,
  HStack,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import NotAuthenticated from "../../components/NotAuthenticated";

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
    item: {
      id: string;
      name: string;
      image: string | null;
    };
  }[];
}

export async function getServerSideProps() {
  const loans = await prisma.loan.findMany({
    include: {
      user: true,
      reservations: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  return { props: { loans } };
}

export const getColor = (status: LoanStatus): string => {
  switch (status) {
    case LoanStatus.ACCEPTED:
      return "green";
    case LoanStatus.REJECTED:
      return "red";
    case LoanStatus.INUSE:
      return "blue";
    case LoanStatus.IN_BOX:
      return "purple";
    case LoanStatus.RETURNED:
      return "gray";
    default:
      return "gray";
  }
};

function compareDates(dateA: Date, dateB: Date) {
  return dateB.getTime() - dateA.getTime();
}

export const LoanCard = ({ loan }: { loan: LoanType }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("fi-FI", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      p={4}
      mb={4}
      bg="white"
      boxShadow="sm"
    >
      <VStack spacing={3} align="stretch">
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
          <Tag colorScheme={getColor(loan.status)} size="md">
            {loan.status}
          </Tag>
        </HStack>

        <HStack spacing={4} fontSize="sm" color="gray.600">
          <Text>
            <Text as="span" fontWeight="medium">
              Alku:
            </Text>{" "}
            {formatDate(loan.startTime)}
          </Text>
          <Text>
            <Text as="span" fontWeight="medium">
              Loppu:
            </Text>{" "}
            {formatDate(loan.endTime)}
          </Text>
        </HStack>

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

export default function LoanList({ loans }: { loans: LoanType[] }) {
  const { data: session } = useSession();
  const [loanCategory, setLoanCategory] = useState<LoanStatus | "ALL">("ALL");

  loans = loans.sort((a, b) =>
    compareDates(new Date(a.startTime), new Date(b.startTime))
  );

  if (session?.user?.group !== "ADMIN") {
    return <NotAuthenticated />;
  }

  if (loans.length === 0) {
    return (
      <Box>
        <Heading>Ei varauksia</Heading>
        <Link as={NextLink} href="/">
          <Button>Luo varaus etusivulla</Button>
        </Link>
      </Box>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <Box>
          <Heading mb={4}>Varaukset</Heading>
          <Select
            value={loanCategory}
            onChange={(e) =>
              setLoanCategory(e.target.value as LoanStatus | "ALL")
            }
            mb={4}
          >
            <option value="ALL">Kaikki</option>
            <option value={LoanStatus.ACCEPTED}>Hyväksytyt</option>
            <option value={LoanStatus.REJECTED}>Hylätyt</option>
            <option value={LoanStatus.INUSE}>Käytössä</option>
            <option value={LoanStatus.IN_BOX}>Laatikossa</option>
            <option value={LoanStatus.RETURNED}>Palautetut</option>
          </Select>
          {loans
            .filter(
              (loan) => loanCategory === "ALL" || loan.status === loanCategory
            )
            .map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
        </Box>
      </Stack>
    </Container>
  );
}
