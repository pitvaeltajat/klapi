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
} from '@chakra-ui/react';
import React from 'react';
import { CartItem } from '../types';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useCart } from '@/contexts/CartContext';
import { useDates } from '@/contexts/DatesContext';

interface InBoxItem {
  itemId: string;
  itemName: string;
}

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
  const [inBoxItems, setInBoxItems] = React.useState<InBoxItem[]>([]);
  const [isCheckingBox, setIsCheckingBox] = React.useState(false);

  const toast = useToast();

  // Check if any items are currently in a box when dialog opens
  React.useEffect(() => {
    const checkInBoxItems = async () => {
      if (!isOpen || cart.items.length === 0) {
        setInBoxItems([]);
        return;
      }

      setIsCheckingBox(true);
      try {
        const itemIds = cart.items
          .filter((item) => !item.id.startsWith('custom-'))
          .map((item) => item.id);

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
  }, [isOpen, cart.items]);

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
      // Kiosk users are redirected to the loan page, others to account
      if (session?.user?.group === 'KIOSK') {
        router.push(`/loan/${responseData.id}`);
      } else {
        router.push('/account');
      }
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
            {inBoxItems.length > 0 && (
              <Alert status="warning" mb={4} borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Huomio: Kamoja laatikossa</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Jotkin näistä kamoista ovat laatikossa edellisen lainauksen jäljiltä. Otat
                    täyden vastuun tarkistaa kamojen kunnon noudettaessa.
                  </AlertDescription>
                </Box>
              </Alert>
            )}

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
            <Button
              colorScheme="green"
              onClick={handleSubmit}
              ml={3}
              isLoading={isLoading || isCheckingBox}
            >
              Lähetä varaus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
