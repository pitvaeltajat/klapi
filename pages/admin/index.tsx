import NextLink from 'next/link';
import Head from 'next/head';
import {
  Box,
  Button,
  Heading,
  Link,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Switch,
  IconButton,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useToast,
  VStack,
  HStack,
  Text,
  Badge,
  Flex,
  PinInput,
  PinInputField,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { MdOutlinePassword } from 'react-icons/md';
import { useSession } from 'next-auth/react';
import { useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import NotAuthenticated from '../../components/NotAuthenticated';
import Breadcrumbs from '../../components/Breadcrumbs';
import type { NextPage } from 'next';
import type { User } from '@prisma/client';

interface UserWithGroup extends User {
  group: 'ADMIN' | 'USER' | 'KIOSK';
}

interface RoleSwitchProps {
  user: UserWithGroup;
}

const RoleSwitch: React.FC<RoleSwitchProps> = ({ user }) => {
  const { mutate } = useSWRConfig();
  const toast = useToast();

  const updateRole = async (userId: string, group: 'ADMIN' | 'USER' | 'KIOSK') => {
    const newGroup = group === 'ADMIN' ? 'USER' : 'ADMIN';

    try {
      await fetch(`/api/user/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group: newGroup,
        }),
      });

      toast({
        title: 'Rooli päivitetty',
        description: `Käyttäjän rooli vaihdettu: ${newGroup}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      mutate('/api/user/getUsers');
    } catch {
      toast({
        title: 'Virhe',
        description: 'Roolin päivitys epäonnistui',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Switch
      colorScheme="green"
      isChecked={user.group === 'ADMIN'}
      onChange={() => updateRole(user.id, user.group)}
      isDisabled={user.group === 'KIOSK'}
    />
  );
};

const Admin: NextPage = () => {
  const { data: session } = useSession();
  const { data: users, error } = useSWR<UserWithGroup[]>('/api/user/getUsers');
  const { mutate } = useSWRConfig();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const subtleText = useColorModeValue('gray.600', 'gray.400');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [userToDelete, setUserToDelete] = useState<UserWithGroup | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Kiosk password dialog state
  const [kioskPassword, setKioskPassword] = useState<string | null>(null);
  const {
    isOpen: isKioskDialogOpen,
    onOpen: openKioskDialog,
    onClose: closeKioskDialog,
  } = useDisclosure();
  const kioskDialogCancelRef = useRef<HTMLButtonElement>(null);

  // Admin PIN dialog state
  const {
    isOpen: isPinDialogOpen,
    onOpen: openPinDialog,
    onClose: closePinDialog,
  } = useDisclosure();
  const pinDialogCancelRef = useRef<HTMLButtonElement>(null);
  const [pinValue, setPinValue] = useState('');

  if (session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  const handleDeleteClick = (user: UserWithGroup) => {
    setUserToDelete(user);
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await fetch(`/api/user/${userToDelete.id}`, {
        method: 'DELETE',
      });

      toast({
        title: 'Käyttäjä poistettu',
        description: `${userToDelete.name || userToDelete.email} poistettu onnistuneesti`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      mutate('/api/user/getUsers');
      onClose();
    } catch {
      toast({
        title: 'Virhe',
        description: 'Käyttäjän poisto epäonnistui',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getGroupBadge = (group: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'purple',
      USER: 'blue',
      KIOSK: 'orange',
    };

    const labels: Record<string, string> = {
      ADMIN: 'Admin',
      USER: 'Käyttäjä',
      KIOSK: 'Kiosk',
    };

    return <Badge colorScheme={colors[group] || 'gray'}>{labels[group] || group}</Badge>;
  };

  const getOTP = async () => {
    try {
      const response = await fetch('/api/user/createKioskPassword', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setKioskPassword(data.kioskPassword);
        openKioskDialog();
      } else {
        throw new Error(data.message || 'Salasanan luominen epäonnistui');
      }
    } catch (error) {
      toast({
        title: 'Virhe',
        description: error instanceof Error ? error.message : 'Salasanan luominen epäonnistui',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const setAdminPin = async (pin: string) => {
    try {
      const response = await fetch('/api/auth/createPin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin: pin,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'PIN-koodi asetettu',
          description: 'Admin PIN-koodi on asetettu onnistuneesti',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Virhe',
          description: data.message || 'PIN-koodin asettaminen epäonnistui',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Virhe',
        description: error instanceof Error ? error.message : 'PIN-koodin asettaminen epäonnistui',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (error) {
    return (
      <Box p={6}>
        <Text color="red.500">Käyttäjien lataaminen epäonnistui</Text>
      </Box>
    );
  }

  if (!users) {
    return (
      <Box p={6}>
        <Text>Ladataan...</Text>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Admin | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Admin' }]} />
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justifyContent="space-between" alignItems="center">
          <Heading size="xl">Admin</Heading>
          <Link as={NextLink} href="/admin/createItem">
            <Button leftIcon={<FaPlus />} colorScheme="green" size="lg">
              Luo uusi kama
            </Button>
          </Link>
        </Flex>

        <Box>
          <Flex justifyContent="flex-end">
            <Button leftIcon={<MdOutlinePassword />} onClick={getOTP} colorScheme="orange">
              Näytä kioskikäyttäjän salasana
            </Button>
          </Flex>
        </Box>

        <Box>
          <Flex justifyContent="flex-end">
            <Button leftIcon={<MdOutlinePassword />} onClick={openPinDialog} colorScheme="orange">
              Aseta admin pin-koodi
            </Button>
          </Flex>
        </Box>

        {/* Admin PIN Modal */}
        <AlertDialog
          isOpen={isPinDialogOpen}
          leastDestructiveRef={pinDialogCancelRef}
          onClose={closePinDialog}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Aseta admin PIN-koodi
              </AlertDialogHeader>
              <AlertDialogBody>
                <Text mb={2}>Syötä uusi 4-merkkinen PIN-koodi:</Text>
                <HStack justifyContent="center" mb={4}>
                  <PinInput value={pinValue} onChange={setPinValue} type="alphanumeric" size="lg">
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                  </PinInput>
                </HStack>
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button colorScheme="gray" ref={pinDialogCancelRef} onClick={closePinDialog}>
                  Peruuta
                </Button>
                <Button
                  colorScheme="orange"
                  ml={3}
                  onClick={async () => {
                    if (pinValue.length === 4) {
                      await setAdminPin(pinValue);
                      setPinValue('');
                      closePinDialog();
                    } else {
                      toast({
                        title: 'Virhe',
                        description: 'PIN-koodin tulee olla 4 merkkiä',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                      });
                    }
                  }}
                  isDisabled={pinValue.length !== 4}
                >
                  Aseta PIN
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>

        {/* User Management Section */}
        <Box borderWidth="1px" borderRadius="lg" p={6} bg={cardBg} boxShadow="sm">
          <HStack justifyContent="space-between" mb={4}>
            <Heading size="md">Käyttäjien hallinta</Heading>
            <Text color={subtleText} fontSize="sm">
              Yhteensä {users.length} käyttäjää
            </Text>
          </HStack>

          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Nimi</Th>
                  <Th>Sähköposti</Th>
                  <Th>Rooli</Th>
                  <Th>Admin-oikeudet</Th>
                  <Th width="100px">Toiminnot</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => (
                  <Tr key={user.id}>
                    <Td fontWeight="medium">{user.name || '-'}</Td>
                    <Td>{user.email}</Td>
                    <Td>{getGroupBadge(user.group)}</Td>
                    <Td>
                      <RoleSwitch user={user} />
                    </Td>
                    <Td>
                      <IconButton
                        aria-label="Poista käyttäjä"
                        icon={<FaTrash />}
                        colorScheme="red"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(user)}
                        isDisabled={user.id === session?.user?.id}
                        title={
                          user.id === session?.user?.id
                            ? 'Et voi poistaa itseäsi'
                            : 'Poista käyttäjä'
                        }
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        {/* Kiosk Password AlertDialog */}
        <AlertDialog
          isOpen={isKioskDialogOpen}
          leastDestructiveRef={kioskDialogCancelRef}
          onClose={closeKioskDialog}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Kioskikäyttäjän salasana luotu
              </AlertDialogHeader>
              <AlertDialogBody>
                Uusi salasana:{' '}
                <Box mt={2} mb={4}>
                  <Text fontSize="2xl" fontWeight="bold" letterSpacing="wider">
                    {kioskPassword}
                  </Text>
                </Box>
                (voimassa 15 minuuttia)
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button colorScheme="gray" ref={kioskDialogCancelRef} onClick={closeKioskDialog}>
                  Sulje
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={() => {
                    navigator.clipboard.writeText(kioskPassword || '');
                    closeKioskDialog();
                  }}
                  ml={3}
                >
                  Kopioi leikepöydälle
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Poista käyttäjä
              </AlertDialogHeader>

              <AlertDialogBody>
                Haluatko varmasti poistaa käyttäjän{' '}
                <Text as="span" fontWeight="bold">
                  {userToDelete?.name || userToDelete?.email}
                </Text>
                ? Tätä toimintoa ei voi perua.
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onClose}>
                  Peruuta
                </Button>
                <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3}>
                  Poista
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </VStack>
    </>
  );
};

export default Admin;
