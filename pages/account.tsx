import Auth from './auth';
import Head from 'next/head';
import { Heading, Stack, Box, Text, VStack, HStack, Switch } from '@chakra-ui/react';
import { useSession, getSession } from 'next-auth/react';
import prisma from '../utils/prisma';
import { LoanCard } from './loan';
import type { GetServerSideProps } from 'next';
import type { Loan, User, ReservationStatus } from '@prisma/client';
import { useState } from 'react';

interface LoanWithUser extends Loan {
  user: User;
  reservations: {
    status: ReservationStatus;
    item: {
      id: string;
      name: string;
    };
  }[];
}

interface AccountProps {
  loans: LoanWithUser[];
  userEmailPreferences: {
    emailWeeklyReminder: boolean;
    emailNewLoanNotification: boolean;
  };
}

export const getServerSideProps: GetServerSideProps<AccountProps> = async (context) => {
  const session = await getSession(context);

  // If no session, return empty data
  if (!session?.user?.id) {
    return {
      props: {
        loans: [],
        userEmailPreferences: {
          emailWeeklyReminder: true,
          emailNewLoanNotification: true,
        },
      },
    };
  }

  const loans = await prisma.loan.findMany({
    where: { user: { id: session.user.id } },
    include: {
      user: true,
      reservations: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Get user email preferences
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailWeeklyReminder: true,
      emailNewLoanNotification: true,
    },
  });

  return {
    props: {
      loans,
      userEmailPreferences: {
        emailWeeklyReminder: user?.emailWeeklyReminder ?? true,
        emailNewLoanNotification: user?.emailNewLoanNotification ?? true,
      },
    },
  };
};

function compareDates(dateA: Date, dateB: Date) {
  return dateB.getTime() - dateA.getTime();
}

export default function Account({ loans, userEmailPreferences }: AccountProps) {
  const { data: session } = useSession();
  const [emailWeeklyReminder, setEmailWeeklyReminder] = useState(
    userEmailPreferences.emailWeeklyReminder,
  );
  const [emailNewLoanNotification, setEmailNewLoanNotification] = useState(
    userEmailPreferences.emailNewLoanNotification,
  );
  const [isSaving, setIsSaving] = useState(false);

  const loansSorted = loans.sort((a, b) =>
    compareDates(new Date(a.startTime), new Date(b.startTime)),
  );

  const handleEmailPreferenceChange = async (preference: 'weekly' | 'newLoan', value: boolean) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/updateEmailPreferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailWeeklyReminder: preference === 'weekly' ? value : emailWeeklyReminder,
          emailNewLoanNotification: preference === 'newLoan' ? value : emailNewLoanNotification,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      if (preference === 'weekly') {
        setEmailWeeklyReminder(value);
      } else {
        setEmailNewLoanNotification(value);
      }
    } catch (error) {
      console.error('Error updating email preferences:', error);
      // Revert the change on error
      if (preference === 'weekly') {
        setEmailWeeklyReminder(!value);
      } else {
        setEmailNewLoanNotification(!value);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Oma tili | Klapi</title>
      </Head>
      <Heading as="h1" size="xl" mb={6}>
        Oma tili
      </Heading>

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
              Rooli:{' '}
              {session?.user?.group === 'USER'
                ? 'Käyttäjä'
                : session?.user?.group === 'KIOSK'
                ? 'Kaluston kone'
                : 'Admin'}
            </Text>
          </VStack>
          <Box my={4} h="1px" bg="gray.200" />
          <Auth />
        </Box>

        <Box
          bg="white"
          p={6}
          borderRadius="md"
          boxShadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <Heading size="md" mb={4}>
            Sähköposti-ilmoitukset
          </Heading>
          <VStack align="start" spacing={4}>
            {session?.user?.group === 'ADMIN' && (
              <HStack justify="space-between" w="full">
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="medium">
                    Viikottainen muistutus bokseissa olevista varauksista
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Vain admin-käyttäjille
                  </Text>
                </VStack>
                <Switch
                  isChecked={emailWeeklyReminder}
                  isDisabled={isSaving}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleEmailPreferenceChange('weekly', e.target.checked)
                  }
                  colorScheme="blue"
                />
              </HStack>
            )}
            {session?.user?.group === 'ADMIN' && (
              <HStack justify="space-between" w="full">
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="medium">
                    Uudet varaukset
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Ilmoitukset uusista varauksista (myös kiosk-käytöstä)
                  </Text>
                </VStack>
                <Switch
                  isChecked={emailNewLoanNotification}
                  isDisabled={isSaving}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleEmailPreferenceChange('newLoan', e.target.checked)
                  }
                  colorScheme="blue"
                />
              </HStack>
            )}
            {session?.user?.group !== 'ADMIN' && (
              <>
                <HStack justify="space-between" w="full">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="medium">
                      Ilmoitukset uusista varauksista
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Sähköpostit kun luot uuden varauksen
                    </Text>
                  </VStack>
                  <Switch
                    isChecked={emailNewLoanNotification}
                    isDisabled={isSaving}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleEmailPreferenceChange('newLoan', e.target.checked)
                    }
                    colorScheme="blue"
                  />
                </HStack>
                <HStack justify="space-between" w="full">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="medium">
                      Muistutukset varauksista
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Muistutukset varauksiesi päättymisestä
                    </Text>
                  </VStack>
                  <Switch
                    isChecked={emailWeeklyReminder}
                    isDisabled={isSaving}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleEmailPreferenceChange('weekly', e.target.checked)
                    }
                    colorScheme="blue"
                  />
                </HStack>
              </>
            )}
          </VStack>
        </Box>

        {session?.user?.group !== 'KIOSK' && (
          <Box>
            <Heading size="md" mb={4}>
              Oma varaushistoria
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
        )}
      </VStack>
    </>
  );
}
