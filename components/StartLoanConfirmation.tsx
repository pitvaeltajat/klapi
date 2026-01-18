import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Text,
} from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Loan, User, Reservation, Item } from '@prisma/client';

interface InBoxItem {
  itemId: string;
  itemName: string;
}

interface LoanWithRelations extends Loan {
  user: User;
  reservations: (Reservation & {
    item: Item;
  })[];
}

export default function StartLoanConfirmation({
  isOpen,
  onClose,
  loan,
}: {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanWithRelations;
}) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [inBoxItems, setInBoxItems] = useState<InBoxItem[]>([]);
  const [isCheckingBox, setIsCheckingBox] = useState(false);

  // Check if any items are currently in a box when dialog opens
  useEffect(() => {
    const checkInBoxItems = async () => {
      if (!isOpen || loan.reservations.length === 0) {
        setInBoxItems([]);
        return;
      }

      setIsCheckingBox(true);
      try {
        const itemIds = loan.reservations
          .filter((res) => !res.itemId.startsWith('custom-'))
          .map((res) => res.itemId);

        if (itemIds.length === 0) {
          setInBoxItems([]);
          return;
        }

        const response = await fetch('/api/reservation/checkInBox', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itemIds }),
        });

        if (response.ok) {
          const data = await response.json();
          setInBoxItems(data.inBoxItems || []);
        }
      } catch (error) {
        console.error('Failed to check in-box items:', error);
      } finally {
        setIsCheckingBox(false);
      }
    };

    checkInBoxItems();
  }, [isOpen, loan.reservations]);

  const handleStartLoan = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/loan/startLoan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: loan.id }),
      });

      if (response.ok) {
        toast({
          title: 'Lainaus aloitettu',
          description: 'Lainaus on nyt käynnissä. Muista palauttaa kamat ajoissa!',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        // Refresh the page to show updated status
        router.reload();
      } else {
        const error = await response.json();
        toast({
          title: 'Virhe',
          description: error.message || 'Lainauksen aloituksessa tapahtui virhe',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch {
      toast({
        title: 'Virhe',
        description: 'Lainauksen aloituksessa tapahtui virhe',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Aloita lainaus
          </AlertDialogHeader>
          <AlertDialogBody>
            {inBoxItems.length > 0 && (
              <Alert status="warning" mb={4} borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Huomio: Kamoja laatikossa</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Jotkin näistä kamoista ovat laatikossa edellisen lainauksen jäljiltä. Otat täyden
                    vastuun tarkistaa kamojen kunnon noudettaessa.
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            <Text mb={2}>
              <b>Lainaaja: </b>
              {loan.loaner || loan.user.name || loan.user.email}
            </Text>
            <Text mb={2}>
              <b>Palautus: </b>
              {new Date(loan.endTime).toLocaleString('fi', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>

            <Text mt={4} mb={2} fontWeight="bold">
              Lainattavat kamat:
            </Text>

            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Kama</Th>
                    <Th isNumeric>Määrä</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {loan.reservations.map((reservation) => (
                    <Tr key={reservation.id}>
                      <Td>{reservation.item.name}</Td>
                      <Td isNumeric>{reservation.amount}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Peruuta
            </Button>
            <Button
              colorScheme="green"
              onClick={handleStartLoan}
              ml={3}
              isLoading={isLoading || isCheckingBox}
            >
              Aloita lainaus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
