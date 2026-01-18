// single loan view
import React from 'react';
import Head from 'next/head';
import prisma from '../../utils/prisma';
import {
  Stack,
  Button,
  Heading,
  Box,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Link,
  Text,
  Tag,
  Checkbox,
  Textarea,
  RadioGroup,
  Radio,
  Flex,
  InputGroup,
  InputRightAddon,
  IconButton,
  Input,
  InputLeftAddon,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import NotAuthenticated from '../../components/NotAuthenticated';
import NextLink from 'next/link';
import ReservationTableLoanView from '../../components/ReservationTableLoanView';
import { useSession } from 'next-auth/react';
import { Loan, User, Reservation, Item, Box as BoxType } from '@prisma/client';
import { GetServerSideProps } from 'next';
import { getLoanStatusLabel, getLoanStatusColor } from '../../utils/loanHelpers';
import { FaMinus, FaPlus } from 'react-icons/fa';

interface LoanWithRelations extends Loan {
  user: User;
  box: BoxType | null;
  reservations: (Reservation & {
    item: Item;
  })[];
}

export const getServerSideProps: GetServerSideProps<{
  loan: LoanWithRelations;
}> = async (req) => {
  if (!req.params?.id || typeof req.params.id !== 'string') {
    return { notFound: true };
  }

  const loan = await prisma.loan.findUnique({
    where: {
      id: req.params.id,
    },
    include: {
      user: true,
      box: true,
      reservations: {
        include: {
          item: true,
        },
      },
    },
  });

  const reports = await prisma.report.findMany({
    where: {
      loanId: req.params.id,
    },
  });

  if (!loan) {
    return { notFound: true };
  }

  return {
    props: {
      loan: JSON.parse(JSON.stringify(loan)),
      reports: JSON.parse(JSON.stringify(reports)),
    },
  };
};

export default function LoanView({
  loan,
  reports,
}: {
  loan: LoanWithRelations;
  reports: {
    affectedItems: any;
    id: string;
    content: string;
    createdAt: Date;
    loanId: string;
  }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [expandedReportId, setExpandedReportId] = React.useState<string | null>(null);
  const { data: session } = useSession();

  const isAdmin = session?.user?.group === 'ADMIN';

  const approveLoan = async () => {
    const body = { id: loan.id };
    await fetch('/api/loan/approveLoan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then(async () => {
        toast({
          title: 'Laina hyväksytty',
          description: 'Laina hyväksytty onnistuneesti',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        await fetch('/api/email/sendApproved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: loan.user.email,
            id: loan.id,
          }),
        });
        router.push('/loan');
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: err.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
    // navigate to all loans view
  };

  const rejectLoan = async () => {
    const body = { id: loan.id };
    await fetch('/api/loan/rejectLoan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then(() => {
        toast({
          title: 'Laina hylätty',
          description: 'Laina hylätty onnistuneesti',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        router.push('/loan');
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: err.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
  };

  const loanProcessed = async () => {
    const body = { id: loan.id };
    await fetch('/api/loan/loanProcessed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then(() => {
        toast({
          title: 'Kamat palautettu',
          description: 'Lainaus saatettu päätökseen',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        router.push('/loan');
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: err.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
  };

  //Check if user is allowed to see information about this loan
  if (!(session?.user?.group === 'ADMIN' || session?.user?.id === loan.user.id)) {
    return (
      <>
        <NotAuthenticated />
      </>
    );
  }

  // Determine which buttons to show based on loan status and user role
  const canReject =
    (isAdmin || session?.user?.id === loan.user.id) &&
    loan.status !== 'REJECTED' &&
    loan.status !== 'INUSE' &&
    loan.status !== 'RETURNED';

  const canEdit = isAdmin && loan.status !== 'INUSE' && loan.status !== 'RETURNED';

  const canApprove =
    isAdmin && loan.status !== 'ACCEPTED' && loan.status !== 'INUSE' && loan.status !== 'RETURNED';

  const canMarkReturned = isAdmin && (loan.status === 'INUSE' || loan.status === 'IN_BOX');

  // list reservations and show loan basic information and user information
  return (
    <>
      <Head>
        <title>Varaus: {loan.description || 'Ei kuvausta'} | Klapi</title>
      </Head>
      <Stack spacing={6}>
        <Heading as="h1" mb={4}>
          Varaus: {loan.description || 'Ei kuvausta'}
        </Heading>

        <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
          <Heading as="h2" size="lg" mb={4}>
            Perustiedot
          </Heading>
          <Stack spacing={3}>
            <Text>
              Aloitusaika:{' '}
              {new Date(loan.startTime).toLocaleString('fi-FI', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </Text>
            <Text>
              Lopetusaika:{' '}
              {new Date(loan.endTime).toLocaleString('fi-FI', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </Text>
            <Text>Varaaja: {loan.user.name}</Text>
            {loan.loaner && <Text>Lainaaja: {loan.loaner}</Text>}
            {loan.box && <Text>Laatikko: {loan.box.name}</Text>}
            <Box>
              <Tag colorScheme={getLoanStatusColor(loan.status)} width="fit-content">
                {getLoanStatusLabel(loan.status)}
              </Tag>
              {reports.length > 0 && (
                <Tag colorScheme="red" size="md" flexShrink={0} ml={2}>
                  Raportteja: {reports.length}
                </Tag>
              )}
            </Box>
          </Stack>
        </Box>

        {reports.length > 0 ? (
          <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
            <Heading as="h2" size="lg" mb={4}>
              Raportit
            </Heading>
            <Stack spacing={4}>
              {reports.map((report) => {
                const expanded = expandedReportId === report.id;
                return (
                  <Box
                    key={report.id}
                    p={expanded ? 6 : 4}
                    borderWidth="1px"
                    borderRadius="md"
                    bg={expanded ? 'gray.50' : 'gray.50'}
                    boxShadow={expanded ? 'lg' : undefined}
                  >
                    <Text whiteSpace="pre-wrap" fontSize={expanded ? 'md' : 'sm'}>
                      {expanded
                        ? report.content
                        : report.content.length < 100
                          ? report.content
                          : report.content.substring(0, 100) + '...'}
                    </Text>
                    <Text fontSize="sm" color="gray.600" mt={2}>
                      Luotu:{' '}
                      {new Date(report.createdAt).toLocaleString('fi-FI', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </Text>
                    {!expanded ? (
                      <Button mt={2} size="sm" onClick={() => setExpandedReportId(report.id)}>
                        Käsittele raportti
                      </Button>
                    ) : (
                      <Box>
                        <Box
                          mt={4}
                          mb={2}
                          fontWeight="semibold"
                          fontSize="lg"
                          borderWidth="1px"
                          p={4}
                          borderRadius="md"
                          bg="white"
                        >
                          <Text mb={2}>Lisää ilmoitus kamalle:</Text>
                          <RadioGroup defaultValue="none">
                            <Stack direction="row">
                              {loan.reservations.map((reservation) => (
                                <Radio value={reservation.item.id} key={reservation.item.id}>
                                  {reservation.item.name}
                                </Radio>
                              ))}
                              <Radio value="none">Ei ilmoitusta</Radio>
                            </Stack>
                          </RadioGroup>

                          <Textarea mt={2} placeholder="Lisää kommentti" rows={3} />
                        </Box>
                        <Box
                          mt={4}
                          mb={2}
                          fontWeight="semibold"
                          fontSize="lg"
                          borderWidth="1px"
                          p={4}
                          borderRadius="md"
                          bg="white"
                        >
                          <Text mb={2}>Poista kama valikoimista käsittelyn ajaksi:</Text>
                          <RadioGroup defaultValue="none">
                            <Stack direction="column">
                              {loan.reservations.map((reservation) => (
                                <Box
                                  key={reservation.item.id}
                                  border="1px"
                                  p={2}
                                  borderRadius="md"
                                  bg="gray.50"
                                >
                                  <Flex justifyContent="space-between" alignItems="center">
                                    {reservation.item.name}
                                    <InputGroup size="md" width="100px" p={2}>
                                      <InputLeftAddon padding={0}>
                                        <IconButton
                                          icon={<FaMinus />}
                                          minW="40px"
                                          aria-label="decrement"
                                        />
                                      </InputLeftAddon>
                                      <Input readOnly textAlign="center" />
                                      <InputRightAddon padding={0}>
                                        <IconButton icon={<FaPlus />} aria-label="increment" />
                                      </InputRightAddon>
                                    </InputGroup>
                                  </Flex>
                                </Box>
                              ))}
                            </Stack>
                          </RadioGroup>
                        </Box>
                        <Stack direction="row" spacing={2} mt={4}>
                          <Button colorScheme="orange" size="sm">
                            Ota käsittelyyn
                          </Button>
                          <Button colorScheme="green" size="sm">
                            Aseta käsitellyksi
                          </Button>
                          <Button
                            colorScheme="gray"
                            size="sm"
                            onClick={() => setExpandedReportId(null)}
                          >
                            Käsittele myöhemmin
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ) : null}

        <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
          <Heading as="h2" size="lg" mb={4}>
            Kamat
          </Heading>
          <ReservationTableLoanView loan={loan} />
        </Box>

        {loan.status === 'RETURNED' ? (
          <Box bg="green.50" p={6} borderRadius="lg" borderWidth="1px" borderColor="green.200">
            <Heading as="h2" size="md" color="green.700">
              ✓ Lainaustapahtuma suoritettu loppuun
            </Heading>
          </Box>
        ) : canMarkReturned ? (
          <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
            <Stack spacing={3}>
              <Heading as="h3" size="md" mb={2}>
                Toiminnot
              </Heading>
              <Button onClick={loanProcessed} colorScheme="green" size="lg" width="full">
                Merkitse kamat palautetuksi
              </Button>
            </Stack>
          </Box>
        ) : (
          (canReject || canEdit || canApprove) && (
            <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
              <Stack spacing={3}>
                <Heading as="h3" size="md" mb={2}>
                  Toiminnot
                </Heading>
                <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
                  {canReject && (
                    <Button colorScheme="red" onClick={onOpen} flex="1">
                      Hylkää
                    </Button>
                  )}
                  {canEdit && (
                    <Link as={NextLink} href={`/admin/editLoan/${loan.id}`} flex="1">
                      <Button colorScheme="yellow" width="full">
                        Muokkaa
                      </Button>
                    </Link>
                  )}
                  {canApprove && (
                    <Button colorScheme="green" onClick={approveLoan} flex="1">
                      Hyväksy
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          )
        )}

        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Hylätäänkö varaus?</ModalHeader>
            <ModalCloseButton />
            <ModalBody>Varaushakemus hylätään. Oletko varma?</ModalBody>

            <ModalFooter>
              <Button colorScheme="red" mr={3} onClick={rejectLoan}>
                Hylkää
              </Button>
              <Button colorScheme="gray" onClick={onClose}>
                Peruuta
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Stack>
    </>
  );
}
