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
  // Get loans that have at least one INUSE reservation
  const loans = await prisma.loan.findMany({
    where: {
      reservations: {
        some: {
          status: ReservationStatus.INUSE,
        },
      },
    },
    include: {
      user: true,
      reservations: {
        include: {
          item: true,
        },
      },
    },
    orderBy: {
      startTime: 'desc',
    },
  });

  return {
    props: serialize({
      loans,
    }),
  };
};

const LoanReturnCard = ({
  loan,
  onReturn,
  onReturnComplete,
}: {
  loan: LoanType;
  onReturn: (
    id: string,
    reservationIds: string[],
  ) => Promise<{ name: string; description: string | null } | null>;
  onReturnComplete: () => void;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isBoxInstructionsOpen,
    onOpen: onBoxInstructionsOpen,
    onClose: onBoxInstructionsClose,
  } = useDisclosure();
  const [boxInfo, setBoxInfo] = React.useState<{
    name: string;
    description: string | null;
  } | null>(null);

  const [termsAccepted, setTermsAccepted] = React.useState(false);

  const [reportContent, setReportContent] = React.useState('');

  // Only show INUSE reservations in the return flow
  const inuseReservations = React.useMemo(
    () => loan.reservations.filter((r) => r.status === ReservationStatus.INUSE),
    [loan.reservations],
  );

  // Selected reservations to return. Default: all INUSE items checked.
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(inuseReservations.map((r) => r.id)),
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected = selectedIds.size === inuseReservations.length;
  const isPartialReturn = selectedIds.size > 0 && selectedIds.size < inuseReservations.length;
  // Move useColorModeValue calls to top level of component
  const itemBg = useColorModeValue('gray.50', 'gray.700');
  const itemBorderColor = useColorModeValue('gray.200', 'gray.600');
  const infoBg = useColorModeValue('blue.50', 'blue.900');
  const successBg = useColorModeValue('green.50', 'green.900');
  const reportBg = useColorModeValue('gray.50', 'gray.700');
  const reportBorder = useColorModeValue('gray.200', 'gray.600');
  const subtleText = useColorModeValue('gray.600', 'gray.400');
  const headingBlue = useColorModeValue('blue.600', 'blue.300');
  const subtleGray = useColorModeValue('gray.700', 'gray.300');
  const successText = useColorModeValue('green.700', 'green.300');
  const infoBorder = useColorModeValue('gray.300', 'gray.600');

  const handleConfirmReturn = async () => {
    const box = await onReturn(loan.id, Array.from(selectedIds));
    if (box) {
      setBoxInfo(box);
      onClose();
      onBoxInstructionsOpen();
    }

    if (reportContent.trim() !== '') {
      try {
        await fetch('/api/loan/createReport', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            loanId: loan.id,
            content: reportContent,
            created: 'AFTER_LOAN',
          }),
        });
      } catch (error) {
        console.error('Virhe raportin lähettämisessä:', error);
      }
    }
  };

  const handleBoxInstructionsClose = () => {
    onBoxInstructionsClose();
    onReturnComplete();
  };

  // Derive the loan status from reservations
  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);

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
              Tavarat (käytössä):
            </Text>
            <HStack spacing={2} flexWrap="wrap">
              {inuseReservations.map((reservation) => (
                <Tag key={reservation.id} size="md" colorScheme="blue" borderRadius="full">
                  {reservation.item.name} ({reservation.amount})
                </Tag>
              ))}
            </HStack>
          </Box>
          <Button colorScheme="green" onClick={onOpen} size="lg">
            Palauta
          </Button>
        </Stack>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent m={0}>
          <ModalCloseButton size="lg" />
          <ModalBody p={8}>
            <VStack spacing={8} maxW="800px" mx="auto" align="stretch">
              <Heading size="xl" textAlign="center" color={headingBlue}>
                Palautat kamoja
              </Heading>

              <Text fontSize="md" textAlign="center" color={subtleText}>
                Valitse mitkä tavarat palautat. Jos sinulla ei ole kaikkia käsillä, voit palauttaa
                osan nyt ja loput myöhemmin.
              </Text>

              <Box p={4} bg="blue.50" borderRadius="lg" borderWidth="2px" borderColor="blue.300">
                <Text fontSize="md" fontWeight="bold" color="blue.800">
                  💡 Vinkki: Ota kuva palautettavista kamoista
                </Text>
                <Text fontSize="sm" mt={1} color="blue.900">
                  Suosittelemme ottamaan kuvan palautettavista tavaroista puhelimellasi ennen kuin
                  laitat ne laatikkoon. Jos palautuksesta tulee myöhemmin hämminkiä (esim. joku
                  väittää, ettei tavaraa palautettu, tai jokin on vioittunut), kuva puhelimessasi
                  toimii omana todisteenasi. Kuvaa ei tarvitse lähettää mihinkään — säilytä se
                  omassa puhelimessasi.
                </Text>
              </Box>

              <VStack spacing={4} align="stretch">
                {inuseReservations.map((reservation) => {
                  const checked = selectedIds.has(reservation.id);
                  return (
                    <HStack
                      key={reservation.id}
                      p={4}
                      bg={itemBg}
                      borderRadius="lg"
                      borderWidth="2px"
                      borderColor={checked ? 'green.400' : itemBorderColor}
                      spacing={4}
                      onClick={() => toggleSelected(reservation.id)}
                      cursor="pointer"
                    >
                      <Checkbox
                        size="lg"
                        isChecked={checked}
                        onChange={() => toggleSelected(reservation.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <ReservationItemImage
                        itemId={reservation.item.id}
                        itemName={reservation.item.name}
                      />
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontSize="lg" fontWeight="bold">
                          {reservation.item.name}
                        </Text>
                        <Text fontSize="md" color={subtleText}>
                          Määrä: {reservation.amount} kpl
                        </Text>
                      </VStack>
                    </HStack>
                  );
                })}
              </VStack>

              {isPartialReturn && (
                <Box
                  p={4}
                  bg={infoBg}
                  borderRadius="lg"
                  borderWidth="2px"
                  borderColor="orange.300"
                >
                  <Text fontSize="md" fontWeight="bold" color="orange.700">
                    Osittainen palautus: {selectedIds.size} / {inuseReservations.length} tavaraa
                  </Text>
                  <Text fontSize="sm" mt={1}>
                    Valitsemattomat tavarat jäävät lainaan ja voit palauttaa ne myöhemmin.
                  </Text>
                </Box>
              )}

              <Box p={6} bg={reportBg} borderRadius="lg" borderWidth="2px" borderColor={reportBorder}>
                <Text fontSize="md" lineHeight="tall">
                  Mikäli jokin tavara puuttuu tai on vahingoittunut lainauksen aikana, kirjoita
                  siitä vapaamuotoinen raportti alle. Tavanomaisesta käytöstä johtuneiden vahinkojen
                  osalta et ole lähtökohtaisesti korvausvastuussa kunhan raportoit niistä.
                </Text>
                <Text fontSize="md" lineHeight="tall" mt={2} fontWeight="bold" color={'red.600'}>
                  <IoMdAlert style={{ display: 'inline', marginRight: '8px' }} />
                  Huomio: Tapahtuneiden vahinkojen ilmoittamatta jättäminen johtaa automaattisesti
                  kaluston lainauskieltoon sekä korvausvastuuseen vahingoittuneen kaluston koko
                  arvoon asti.
                </Text>
                <Textarea
                  placeholder="Kirjoita raportti tähän..."
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  size="lg"
                  resize="vertical"
                  minHeight="120px"
                />
              </Box>

              <Box p={6} bg={infoBg} borderRadius="lg" borderWidth="2px" borderColor="blue.200">
                <Text fontSize="md" lineHeight="tall">
                  Vahvistamalla palautuksen otat vastuun siitä, että valitsemasi tavarat ovat
                  mukana, puhtaita ja toimivassa kunnossa sekä mahdolliset vahingot raportoituna.
                  Palauta tavarat oikeaan laatikkoon.
                </Text>

                <Checkbox
                  mt={4}
                  isRequired
                  isChecked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                >
                  {allSelected
                    ? 'Ymmärrän ja hyväksyn vastuuni palautettavista tavaroista.'
                    : 'Ymmärrän että valitsemattomat tavarat jäävät yhä minun vastuulleni.'}
                </Checkbox>
              </Box>

              <Button
                colorScheme="green"
                size="lg"
                onClick={handleConfirmReturn}
                height="60px"
                fontSize="xl"
                isDisabled={!termsAccepted || selectedIds.size === 0}
              >
                {isPartialReturn
                  ? `Vahvista osittainen palautus (${selectedIds.size})`
                  : 'Vahvista palautus'}
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isBoxInstructionsOpen}
        onClose={handleBoxInstructionsClose}
        size="xl"
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent>
          <ModalHeader fontSize="2xl" textAlign="center" pt={6}>
            Palautusohje
          </ModalHeader>
          <ModalBody pb={6}>
            <VStack spacing={6}>
              <Box
                p={8}
                bg={infoBg}
                borderRadius="lg"
                width="100%"
                textAlign="center"
                borderWidth="3px"
                borderColor="blue.400"
              >
                <Text fontSize="lg" color={subtleGray} mb={3} fontWeight="medium">
                  Palauta tavarat lokeroon:
                </Text>
                <Heading size="3xl" color={headingBlue}>
                  {boxInfo?.name}
                </Heading>
              </Box>
              {boxInfo?.description && (
                <Box
                  p={5}
                  bg={infoBg}
                  borderRadius="md"
                  width="100%"
                  borderWidth="1px"
                  borderColor={infoBorder}
                >
                  <Text fontWeight="bold" mb={2} fontSize="lg">
                    Lisätiedot:
                  </Text>
                  <Text fontSize="md">{boxInfo.description}</Text>
                </Box>
              )}
              <Box p={5} bg={successBg} borderRadius="md" width="100%" textAlign="center">
                <Text color={successText} fontSize="md" fontWeight="medium">
                  Kiitos palauttamisesta! Muista laittaa kaikki tavarat oikeaan lokeroon.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center" pb={6}>
            <Button
              colorScheme="blue"
              onClick={handleBoxInstructionsClose}
              size="lg"
              width="200px"
              height="60px"
              fontSize="xl"
            >
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default function KioskReturn({ loans }: { loans: LoanType[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();

  const handleReturn = async (
    loanId: string,
    reservationIds: string[],
  ): Promise<{ name: string; description: string | null } | null> => {
    try {
      const response = await fetch('/api/loan/loanReturned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: loanId, reservationIds }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Palautus onnistui!',
          description: 'Laina on merkitty palautetuksi.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        return result.box;
      } else {
        throw new Error('Palautus epäonnistui');
      }
    } catch {
      toast({
        title: 'Virhe',
        description: 'Palautus epäonnistui. Yritä uudelleen.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return null;
    }
  };

  const handleReturnComplete = () => {
    router.push('/');
  };

  if (session?.user?.group !== 'KIOSK' && session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  return (
    <>
      <Head>
        <title>Palauta lainoja | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Palauta lainoja' }]} />
      <Stack spacing={8}>
        <Box>
          <Heading mb={4}>Palauta lainoja</Heading>
          {loans.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Heading size="md" color="gray.500">
                Ei käytössä olevia lainoja
              </Heading>
            </Box>
          ) : (
            loans.map((loan) => (
              <LoanReturnCard
                key={loan.id}
                loan={loan}
                onReturn={handleReturn}
                onReturnComplete={handleReturnComplete}
              />
            ))
          )}
        </Box>
      </Stack>
    </>
  );
}
