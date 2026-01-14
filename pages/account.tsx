import Auth from "./auth";
import { Heading, Stack, Box, Text, Divider, VStack } from "@chakra-ui/react";
import { useSession, getSession } from "next-auth/react";
import prisma from "../utils/prisma";
import { LoanCard } from "./loan";
import type { GetServerSideProps } from "next";
import type { Loan, User } from "@prisma/client";

interface LoanWithUser extends Loan {
  user: User;
  reservations: {
    item: {
      id: string;
      name: string;
      image: string | null;
    };
  }[];
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
      <VStack spacing={6} align="stretch">
        <Box
          bg="white"
          p={6}
          borderRadius="md"
          boxShadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <VStack align="start" spacing={3}>
            <Heading size="lg">{session?.user?.name}</Heading>
            <Text fontSize="md" color="gray.600">
              {session?.user?.email}
            </Text>
            <Text fontSize="sm" color="gray.500">
              Rooli:{" "}
              {session?.user?.group === "USER"
                ? "Käyttäjä"
                : session?.user?.group === "KIOSK"
                ? "Kaluston kone"
                : "Admin"}
            </Text>
          </VStack>
          <Divider my={4} />
          <Auth />
        </Box>

        <Box>
          <Heading size="md" mb={4}>
            Omat varaukset:
          </Heading>
          {loansSorted.length > 0 ? (
            <Stack spacing={4}>
              {loansSorted.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </Stack>
          ) : (
            <Text color="gray.500" textAlign="center" py={8}>
              Ei varauksia
            </Text>
          )}
        </Box>
      </VStack>
    );
  } else {
    return (
      <Box
        bg="white"
        p={6}
        borderRadius="md"
        boxShadow="sm"
        borderWidth="1px"
        borderColor="gray.200"
      >
        <VStack spacing={4} align="start">
          <Heading size="lg">Ei kirjautunut sisään</Heading>
          <Auth />
        </VStack>
      </Box>
    );
  }
}
