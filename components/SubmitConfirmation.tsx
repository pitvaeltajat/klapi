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
} from '@chakra-ui/react';
import React from 'react';
import { CartItem } from '../types';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useCart } from '@/contexts/CartContext';
import { useDates } from '@/contexts/DatesContext';

export default function SubmitConfirmation({
  isOpen,
  onClose,
  closeDrawer,
  setReportContent,
  reportContent,
}: {
  isOpen: boolean;
  onClose: () => void;
  closeDrawer: () => void;
  setReportContent: React.Dispatch<React.SetStateAction<string>>;
  reportContent?: string;
}) {
  const { state: dates } = useDates();
  const { state: cart, clearCart } = useCart();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const { data: session } = useSession();

  const [isLoading, setIsLoading] = React.useState(false);

  const toast = useToast();

  const successToast = () => {
    toast({
      title: 'Varaus lähetetty',
      description:
        'Varaus rekisteröitiin onnistuneesti. Voit tarkastella omia varauksiasi Oma tili -valikon takaa.',
      status: 'success',
      duration: 9000,
      isClosable: true,
    });
  };

  const errorToast = () => {
    toast({
      title: 'Error',
      description: 'Varauksen lähetyksessä tapahtui virhe',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const startTime = dates.startDate;
    const endTime = dates.endDate;

    // Use userId from cart context if available (kiosk mode with selected user)
    // Otherwise fall back to session user id
    const userId = cart.userId || session?.user?.id;

    const reservations = cart.items.map((cartitem: CartItem) => ({
      itemId: cartitem.id,
      amount: cartitem.amount,
      // include name for custom items so API can create temporary Item records
      ...(cartitem.id.startsWith('custom-') ? { name: cartitem.name } : {}),
    }));

    const description = cart.description;
    const loaner = cart.loaner;

    const body = {
      reservations,
      startTime,
      endTime,
      userId,
      description,
      loaner,
    };

    const response = await fetch('/api/loan/submitLoan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const responseData = await response.json();

    if (response.ok) {
      if (reportContent && reportContent.trim().length > 0) {
        await fetch('/api/loan/createReport', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: reportContent,
            loanId: responseData.id,
            created: 'BEFORE_LOAN',
          }),
        });
      }

      setReportContent('');
      clearCart();
      successToast();
      router.push('/account');
    } else {
      errorToast();
    }

    onClose();
    closeDrawer();
    setIsLoading(false);
  };

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Tarkista varauksen tiedot:
          </AlertDialogHeader>
          <AlertDialogBody>
            <p>
              <b>Lainaaja: </b>
              {cart.loaner || session?.user?.name || session?.user?.email || 'Ei määritelty'}
              <br />
              <br />

              <b>Kamojen nouto: </b>
              {dates.startDate.toLocaleString('fi', {
                day: 'numeric',
                year: 'numeric',
                month: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              <br />

              <b>Kamojen palautus: </b>
              {dates.endDate.toLocaleString('fi', {
                day: 'numeric',
                year: 'numeric',
                month: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
            <br />

            <p>Varattavat kamat:</p>
            <br />

            <TableContainer>
              <Table variant="simple" size={'sm'}>
                <Thead>
                  <Tr>
                    <Th>Kama</Th>
                    <Th isNumeric>Määrä</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {cart.items.map((cartItem) => (
                    <Tr key={cartItem.id}>
                      <Td>{cartItem.name}</Td>
                      <Td isNumeric>{cartItem.amount}</Td>
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
            <Button colorScheme="green" onClick={handleSubmit} ml={3} isLoading={isLoading}>
              Lähetä varaus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
