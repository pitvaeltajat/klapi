import Auth from "./auth";
import {
  Heading,
  Stack,
  Container,
  Box,
  Text,
  VStack,
  Card,
  CardBody,
} from "@chakra-ui/react";
import { useSession, getSession } from "next-auth/react";
import prisma from "../utils/prisma";
import { LoanCard } from "./loan";
import type { GetServerSideProps } from "next";
import type { Loan, User } from "@prisma/client";

interface LoanWithUser extends Loan {
  user: User;
}

interface AccountProps {
  loans: LoanWithUser[];
}

export const getServerSideProps: GetServerSideProps<AccountProps> = async (
  context
) => {
  const session = await getSession(context);

  const loans = await prisma.loan.findMany({
    where: { user: { id: session?.user?.id } },
    include: {
      user: true,
    },
  });

  return {
    props: {
      loans,
    },
  };
};

function compareDates(dateA: Date, dateB: Date) {
  return dateB.getTime() - dateA.getTime();
}

export default function Account({ loans }: AccountProps) {
  const { data: session } = useSession();

  const loansSorted = loans.sort((a, b) =>
    compareDates(new Date(a.startTime), new Date(b.startTime))
  );

  if (session) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack spacing={8} align="stretch">
          <Card>
            <CardBody>
              <VStack spacing={2} align="stretch">
                <Heading size="lg">{session?.user?.name}</Heading>
                <Text fontSize="md" color="gray.600">
                  {session?.user?.email}
                </Text>
                <Text fontSize="md">
                  Rooli:{" "}
                  <Text as="span" fontWeight="medium">
                    {session?.user?.group === "USER" ? "Käyttäjä" : "Admin"}
                  </Text>
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Box>
            <Auth />
          </Box>

          <Box>
            <Heading size="md" mb={4}>
              Omat varaukset
            </Heading>
            <Stack spacing={4}>
              {loansSorted.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </Stack>
          </Box>
        </VStack>
      </Container>
    );
  } else {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack spacing={8} align="center">
          <Heading>Ei kirjautunut sisään</Heading>
          <Auth />
        </VStack>
      </Container>
    );
  }
}
