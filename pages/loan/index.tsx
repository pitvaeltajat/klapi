import { GetServerSideProps } from "next";
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
}

export async function getServerSideProps() {
  const loans = await prisma.loan.findMany({
    include: {
      user: true,
    },
  });

  return { props: { loans } };
}

const getColor = (status: LoanStatus): string => {
  switch (status) {
    case LoanStatus.PENDING:
      return "yellow";
    case LoanStatus.ACCEPTED:
      return "green";
    case LoanStatus.REJECTED:
      return "red";
    case LoanStatus.INUSE:
      return "blue";
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
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      p={4}
      mb={4}
      bg="white"
    >
      <Stack spacing={2}>
        <Heading size="md">
          <Link as={NextLink} href={`/loan/${loan.id}`}>
            {loan.description || loan.user.name}
          </Link>
        </Heading>
        <Tag colorScheme={getColor(loan.status)} width="fit-content">
          {loan.status}
        </Tag>
        <Text>
          <p>Varaaja: {loan.user.name}</p>
        </Text>
      </Stack>
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
            <option value={LoanStatus.PENDING}>Odottavat</option>
            <option value={LoanStatus.ACCEPTED}>Hyväksytyt</option>
            <option value={LoanStatus.REJECTED}>Hylätyt</option>
            <option value={LoanStatus.INUSE}>Käytössä</option>
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
