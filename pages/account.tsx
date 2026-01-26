import Head from 'next/head';
import {
  Heading,
  Stack,
  Box,
  Text,
  VStack,
  HStack,
  Switch,
  useColorModeValue,
  useColorMode,
  Button,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  RadioGroup,
  Radio,
} from '@chakra-ui/react';
import { useSession, getSession, signOut } from 'next-auth/react';
import prisma from '../utils/prisma';
import { LoanCard } from './loan';
import Breadcrumbs from '../components/Breadcrumbs';
import type { GetServerSideProps } from 'next';
import type { Loan, User, ReportCreated, ReportStatus, ReservationStatus } from '@prisma/client';
import { useState, useEffect } from 'react';
import React from 'react';
import { LuTriangleAlert } from 'react-icons/lu';

interface Report {
  id: string;
  content: string;
  createdAt: Date;
  created: ReportCreated;
  status: ReportStatus;
}

interface LoanWithUser extends Loan {
  user: User;
  reservations: {
    status: ReservationStatus;
    item: {
      id: string;
      name: string;
    };
  }[];
  reports: Report[];
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

  const rawLoans = await prisma.loan.findMany({
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
      reports: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          created: true,
          status: true,
        },
      },
    },
  });

  // Map reports to correct enum types
  const loans = rawLoans.map((loan) => ({
    ...loan,
    reports: loan.reports.map((report) => ({
      ...report,
      created: report.created as ReportCreated,
      status: report.status as ReportStatus,
    })),
  }));

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
  const { colorMode, setColorMode } = useColorMode();
  const [colorModePreference, setColorModePreference] = useState<'light' | 'dark' | 'system'>(
    'system',
  );

  // Load color mode preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('chakra-ui-color-mode-preference');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setColorModePreference(stored);
    }
  }, []);

  // Handle color mode preference change
  const handleColorModeChange = (value: string) => {
    const preference = value as 'light' | 'dark' | 'system';
    setColorModePreference(preference);
    localStorage.setItem('chakra-ui-color-mode-preference', preference);

    if (preference === 'system') {
      // Use system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setColorMode(systemPrefersDark ? 'dark' : 'light');
    } else {
      setColorMode(preference);
    }
  };

  // Listen for system color scheme changes when in system mode
  useEffect(() => {
    if (colorModePreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setColorMode(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [colorModePreference, setColorMode]);

  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorderColor = useColorModeValue('gray.200', 'gray.600');
  const dividerColor = useColorModeValue('gray.200', 'gray.600');

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

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef(null);

  const handleSignOut = () => {
    if (session && session.user.group === 'KIOSK') {
      onOpen();
      return;
    }
    signOut();
  };

  if (!session) {
    return null;
  }

  // Helper to get effective group
  const effectiveGroup = session?.user?.group;

  return (
    <>
      <Head>
        <title>Oma tili | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Oma tili' }]} />
      <Heading as="h1" size="xl" mb={6}>
        Oma tili
      </Heading>
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => {
          onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Kaluston koneen uloskirjautuminen
            </AlertDialogHeader>
            <AlertDialogBody>
              Olet kirjautumassa ulos kaluston koneen käyttäjältä. Tätä ei yleensä pitäisi tehdä
              jotta myös seuraava käyttäjä voi käyttää laitetta normaalisti. Haluatko varmasti
              kirjautua ulos?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={() => {
                  onClose();
                }}
              >
                Peruuta
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  signOut();
                  onClose();
                }}
                ml={3}
              >
                <LuTriangleAlert style={{ marginRight: '0.4em' }} />
                Kirjaudu ulos
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <VStack spacing={6} align="stretch">
        <Box
          bg={cardBg}
          p={6}
          borderRadius="md"
          boxShadow="sm"
          borderWidth="1px"
          borderColor={cardBorderColor}
        >
          <VStack align="start" spacing={3}>
            <Heading size="lg">{session?.user?.name}</Heading>
            <Text fontSize="md" color="gray.600">
              {session?.user?.email}
            </Text>
            <Text fontSize="sm" color="gray.500">
              Rooli:{' '}
              {effectiveGroup === 'USER'
                ? 'Käyttäjä'
                : effectiveGroup === 'KIOSK'
                  ? 'Kaluston kone'
                  : 'Admin'}
            </Text>
            {session?.user?.group === 'KIOSK' && effectiveGroup === 'ADMIN' && (
              <Text fontSize="xs" color="green.500" mt={1}>
                ADMIN-oikeudet käytössä (tähän sessioon)
              </Text>
            )}
            {/* PIN-koodin syöttömodal poistettu */}
          </VStack>
          <Box my={4} h="1px" bg={dividerColor} />
          <Button colorScheme="red" onClick={handleSignOut}>
            Kirjaudu ulos
          </Button>
        </Box>

        <Box
          bg={cardBg}
          p={6}
          borderRadius="md"
          boxShadow="sm"
          borderWidth="1px"
          borderColor={cardBorderColor}
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

        <Box
          bg={cardBg}
          p={6}
          borderRadius="md"
          boxShadow="sm"
          borderWidth="1px"
          borderColor={cardBorderColor}
        >
          <Heading size="md" mb={4}>
            Ulkoasu
          </Heading>
          <VStack align="start" spacing={4}>
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="medium">
                Teema
              </Text>
              <Text fontSize="xs" color="gray.500">
                Valitse sovelluksen väritila
              </Text>
            </VStack>
            <RadioGroup value={colorModePreference} onChange={handleColorModeChange}>
              <HStack spacing={4}>
                <Radio value="light">Vaalea</Radio>
                <Radio value="dark">Tumma</Radio>
                <Radio value="system">Järjestelmä</Radio>
              </HStack>
            </RadioGroup>
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
