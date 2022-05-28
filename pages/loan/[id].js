// single loan view
import React from 'react';
import prisma from '/utils/prisma';
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
} from '@chakra-ui/react';
import { useRouter } from 'next/router';

import ReservationTableLoanView from '../../components/ReservationTableLoanView';

export async function getServerSideProps(req, res) {
    const loan = await prisma.loan.findUnique({
        where: {
            id: req.params.id,
        },
        include: {
            user: true,
            reservations: {
                include: {
                    item: true,
                },
            },
        },
    });
    if (!loan) {
        return {
            notFound: true,
        };
    }

    return {
        props: {
            loan,
        },
    };
}

export default function LoanView({ loan }) {
    const router = useRouter();
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();

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
            .then((data) => {
                toast({
                    title: 'Loan approved',
                    description: 'Loan has been approved',
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
            .then((data) => {
                toast({
                    title: 'Loan rejected',
                    description: 'Loan has been rejected',
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

    // first, double-check that the user really wants to reject the loan with a modal

    // list reservations and show loan basic information and user information
    return (
        <>
            <Heading as='h1'>
                Varaus: {loan.description || 'Ei kuvausta'}
            </Heading>
            <Heading as='h2' size='lg'>
                Perustiedot
            </Heading>
            <Stack direction='column' spacing={4}>
                <Box>
                    <p>Aloitusaika: {loan.startTime.toLocaleString('fi-FI')}</p>
                    <p>Lopetusaika: {loan.endTime.toLocaleString('fi-FI')}</p>
                    <p>Varaaja: {loan.user.name}</p>
                    <p>Status: {loan.status} </p>
                </Box>
            </Stack>
            <Heading as='h2' size='lg'>
                Kamat
            </Heading>
            <ReservationTableLoanView loan={loan} />

            <Stack direction={'row'}>
                <Button colorScheme={'red'} onClick={onOpen}>
                    Hylkää
                </Button>
                <Button colorScheme={'yellow'}>Muokkaa</Button>
                <Button colorScheme={'green'} onClick={approveLoan}>
                    Hyväksy
                </Button>
                <Modal isOpen={isOpen} onClose={onClose}>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>Hylätäänkö varaus?</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody>
                            Varaushakemus hylätään. Oletko varma?
                        </ModalBody>

                        <ModalFooter>
                            <Button
                                colorScheme='blue'
                                mr={3}
                                onClick={rejectLoan}
                            >
                                Hylkää
                            </Button>
                            <Button colorScheme='gray' onClick={onClose}>
                                Peruuta
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            </Stack>
        </>
    );
}
