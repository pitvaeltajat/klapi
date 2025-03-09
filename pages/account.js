import Auth from "./auth";
import { Heading, Stack } from "@chakra-ui/react";
import { useSession, getSession } from "next-auth/react";
import prisma from "/utils/prisma";
import { LoanCard } from "./loan";

export async function getServerSideProps() {
  const session = await getSession();

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
}

export default function Account({ loans }) {
  const { data: session, status } = useSession();
  loans = loans.filter((loan) => loan.user.id === session?.user?.id);
  loans = loans.sort((a, b) => {
    let dateA = new Date(a.startTime);
    let dateB = new Date(b.startTime);
    return dateB - dateA;
  });

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
