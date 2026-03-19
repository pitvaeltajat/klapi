import React from 'react';
import Head from 'next/head';
import prisma from '../../utils/prisma';
import {
  Box,
  Button,
  Heading,
  Stack,
  Tag,
  Text,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  VStack,
  Image,
  HStack,
  Checkbox,
  Textarea,
  useColorModeValue,
} from '@chakra-ui/react';
import { IoMdAlert } from 'react-icons/io';
import { useSession } from 'next-auth/react';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import type { GetServerSideProps } from 'next';
import { serialize } from '@/utils/serialize';
import NotAuthenticated from '../../components/NotAuthenticated';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useRouter } from 'next/router';
import { deriveLoanStatus, getLoanStatusLabel, getLoanStatusColor } from '../../utils/loanHelpers';
import { useItemImage } from '../../hooks/useItemImage';

interface Reservation {
  id: string;
  amount: number;
  status: ReservationStatus;
  item: {
    id: string;
    name: string;
  };
}

// Helper component to use hooks inside map
function ReservationItemImage({ itemId, itemName }: { itemId: string; itemName: string }) {
  const imageSrc = useItemImage(itemId);
  return <Image src={imageSrc} alt={itemName} boxSize="80px" objectFit="cover" borderRadius="md" />;
}

interface LoanType {
  id: string;
  userId: string;
  status: LoanStatus;
  description: string | null;
  startTime: Date;
  endTime: Date;
  loaner: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
  reservations: Reservation[];
}

export const getServerSideProps: GetServerSideProps = async () => {
  const loans = await prisma.loan.findMany({
    where: {
      status: LoanStatus.ACCEPTED,
    },
    include: {
      user: true,
      reservations: {
        include: {
          item: true,
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  return {
    props: serialize({
      loans,
    }),
  };
};

const LoanStartCard = ({
  loan,
  onStart,
  onStartComplete,
}: {
  loan: LoanType;
  onStart: (id: string) => Promise<void>;
  onStartComplete: () => void;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [reportContent, setReportContent] = React.useState('');
  const itemBg = useColorModeValue('gray.50', 'gray.700');
  const itemBorderColor = useColorModeValue('gray.200', 'gray.600');

  // Derive the loan status from reservations
  const derivedStatus = deriveLoanStatus(loan.reservations);
  const acceptedReservations = loan.reservations.filter(
    (r) => r.status === ReservationStatus.ACCEPTED,
  );

  const handleStartLoan = async () => {
    // Lähetä puutteet backendille, jos kenttä ei ole tyhjä
    if (reportContent.trim() !== '') {
      try {
        await fetch('/api/loan/createReport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loanId: loan.id, content: reportContent, created: 'BEFORE_LOAN' }),
        });
      } catch (e) {
        console.error('Virhe luotaessa raporttia:', e);
      }
    }
    await onStart(loan.id);
    onClose();
    onStartComplete();
  };

  return (
    <>
      <Box borderWidth="1px" borderRadius="lg" overflow="hidden" p={4} mb={4}>
        <Stack spacing={3}>
          <Heading size="md">{loan.description || loan.loaner}</Heading>
          <Tag colorScheme={getLoanStatusColor(derivedStatus)} width="fit-content">
            {getLoanStatusLabel(derivedStatus)}
          </Tag>
          <Text>Lainaaja: {loan.loaner}</Text>
          <Text>
            Laina-aika: {new Date(loan.startTime).toLocaleDateString('fi-FI')} -{' '}
            {new Date(loan.endTime).toLocaleDateString('fi-FI')}
          </Text>
          <Box>
            <Text fontWeight="bold" mb={2}>
              Tavarat:
            </Text>
            <HStack spacing={2} flexWrap="wrap">
              {acceptedReservations.map((reservation) => (
                <Tag key={reservation.id} size="md" colorScheme="blue" borderRadius="full">
                  {reservation.item.name} ({reservation.amount})
                </Tag>
              ))}
            </HStack>
          </Box>
          <Button colorScheme="green" onClick={onOpen} size="lg">
            Aloita lainaus
          </Button>
        </Stack>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Hyväksy lainauksen aloitus</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>
              Vahvistamalla lainauksen aloituksen otat vastuullesi lainattavat tavarat.
            </Text>
            <Box
              mb={4}
              p={3}
              bg={itemBg}
              borderRadius="md"
              borderWidth="1px"
              borderColor={itemBorderColor}
            >
              <Text fontSize="md" lineHeight="tall">
                Tarkista ennen varauksen vahvistamista, että kaikki kamat ovat kunnossa ja
                mahdolliset vahingot on raportoitu alla olevaan kenttään. (Esim. puuttuvat kiilat,
                reikä laavussa tms.)
              </Text>
              <Text fontSize="md" lineHeight="tall" mt={2} color={'red.600'}>
                <IoMdAlert style={{ display: 'inline', marginRight: '8px' }} />
                Huomio: Voit joutua korvausvastuuseen, mikäli et ole raportoinut etukäteen kamoissa
                havaitsemiasi puutteita tai vahinkoja.
              </Text>
              <Textarea
                placeholder="Kirjoita puutteet tai huomiot tähän..."
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                mt={2}
                size="sm"
                minH="100px"
              />
            </Box>
            <Checkbox
              isChecked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            >
              Ymmärrän ja hyväksyn vastuuni lainattavista tavaroista.
            </Checkbox>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" onClick={handleStartLoan} isDisabled={!termsAccepted}>
              Aloita lainaus
            </Button>
            <Button variant="ghost" onClick={onClose} ml={3}>
              Peruuta
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default function KioskStartLoan({ loans }: { loans: LoanType[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();

  const handleStart = async (loanId: string) => {
    try {
      const response = await fetch('/api/loan/startLoan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: loanId }),
      });
      if (response.ok) {
        toast({
          title: 'Lainaus aloitettu!',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error('Lainauksen aloitus epäonnistui');
      }
    } catch {
      toast({
        title: 'Virhe',
        description: 'Lainauksen aloitus epäonnistui. Yritä uudelleen.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleStartComplete = () => {
    router.push('/');
  };

  if (session?.user?.group !== 'KIOSK' && session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  return (
    <>
      <Head>
        <title>Aloita lainaus | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Aloita lainaus' }]} />
      <Stack spacing={8}>
        <Box>
          <Heading mb={4}>Aloita lainaus</Heading>
          {loans.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Heading size="md" color="gray.500">
                Ei aloitettavia lainoja
              </Heading>
            </Box>
          ) : (
            loans.map((loan) => (
              <LoanStartCard
                key={loan.id}
                loan={loan}
                onStart={handleStart}
                onStartComplete={handleStartComplete}
              />
            ))
          )}
        </Box>
      </Stack>
    </>
  );
}
