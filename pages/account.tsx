import Auth from "./auth";
import { Heading, Stack } from "@chakra-ui/react";
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
  loans = loans.filter((loan) => loan.user.id === session?.user?.id);
  loans = loans.sort((a, b) =>
    compareDates(new Date(a.startTime), new Date(b.startTime))
  );

  if (session) {
    return (
      <>
        <Heading>{session?.user?.name}</Heading>
        <Heading>{session?.user?.email}</Heading>
        <Heading>
          Rooli: {session?.user?.group === "USER" ? "Käyttäjä" : "Admin"}
        </Heading>
        <Auth />
        <Heading size="md">Omat varaukset:</Heading>
        <Stack spacing={5}>
          {loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}
        </Stack>
      </>
    );
  } else {
    return (
      <>
        <Heading>Ei kirjautunut sisään</Heading>
        <Auth />
      </>
    );
  }
}
