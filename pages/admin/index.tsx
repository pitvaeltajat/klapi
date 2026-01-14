import NextLink from "next/link";
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
} from "@chakra-ui/react";
import { FaTrash, FaPlus } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import NotAuthenticated from "../../components/NotAuthenticated";
import {
  cardStyles,
  headingSizes,
  spacing,
  buttonColors,
} from "@/styles/designTokens";
import type { NextPage } from "next";
import type { User } from "@prisma/client";

interface UserWithGroup extends User {
  group: "ADMIN" | "USER" | "KIOSK";
}

interface RoleSwitchProps {
  user: UserWithGroup;
}

const RoleSwitch: React.FC<RoleSwitchProps> = ({ user }) => {
  const { mutate } = useSWRConfig();
  const toast = useToast();

  const updateRole = async (
    userId: string,
    group: "ADMIN" | "USER" | "KIOSK"
  ) => {
    const newGroup = group === "ADMIN" ? "USER" : "ADMIN";

    try {
      await fetch(`/api/user/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          group: newGroup,
        }),
      });

      toast({
        title: "Rooli päivitetty",
        description: `Käyttäjän rooli vaihdettu: ${newGroup}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      mutate("/api/user/getUsers");
    } catch (error) {
      toast({
        title: "Virhe",
        description: "Roolin päivitys epäonnistui",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Switch
      colorScheme="green"
      checked={user.group === "ADMIN"}
      onChange={() => updateRole(user.id, user.group)}
      disabled={user.group === "KIOSK"}
    />
  );
};

const Admin: NextPage = () => {
  const { data: session } = useSession();
  const { data: users, error } = useSWR<UserWithGroup[]>("/api/user/getUsers");
  const { mutate } = useSWRConfig();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [userToDelete, setUserToDelete] = useState<UserWithGroup | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  if (session?.user?.group !== "ADMIN") {
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
        method: "DELETE",
      });

      toast({
        title: "Käyttäjä poistettu",
        description: `${
          userToDelete.name || userToDelete.email
        } poistettu onnistuneesti`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      mutate("/api/user/getUsers");
      onClose();
    } catch (error) {
      toast({
        title: "Virhe",
        description: "Käyttäjän poisto epäonnistui",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getGroupBadge = (group: string) => {
    const colors: Record<string, string> = {
      ADMIN: "purple",
      USER: "blue",
      KIOSK: "orange",
    };

    const labels: Record<string, string> = {
      ADMIN: "Admin",
      USER: "Käyttäjä",
      KIOSK: "Kiosk",
    };

    return (
      <Badge colorScheme={colors[group] || "gray"}>
        {labels[group] || group}
      </Badge>
    );
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
    <VStack spacing={spacing.sectionSpacing} align="stretch">
      {/* Header */}
      <Flex justifyContent="space-between" alignItems="center">
        <Heading size={headingSizes.pageTitle}>Admin</Heading>
        <Link as={NextLink} href="/admin/createItem">
          <Button
            leftIcon={<FaPlus />}
            colorScheme={buttonColors.success}
            size="lg"
          >
            Luo uusi kama
          </Button>
        </Link>
      </Flex>

      {/* User Management Section */}
      <Box {...cardStyles.base}>
        <HStack justifyContent="space-between" mb={spacing.elementSpacing}>
          <Heading size={headingSizes.sectionTitle}>
            Käyttäjien hallinta
          </Heading>
          <Text color="gray.600" fontSize="sm">
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
                  <Td fontWeight="medium">{user.name || "-"}</Td>
                  <Td>{user.email}</Td>
                  <Td>{getGroupBadge(user.group)}</Td>
                  <Td>
                    <RoleSwitch user={user} />
                  </Td>
                  <Td>
                    <IconButton
                      aria-label="Poista käyttäjä"
                      icon={<FaTrash />}
                      colorScheme={buttonColors.danger}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(user)}
                      isDisabled={user.id === session?.user?.id}
                      title={
                        user.id === session?.user?.id
                          ? "Et voi poistaa itseäsi"
                          : "Poista käyttäjä"
                      }
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Poista käyttäjä
            </AlertDialogHeader>

            <AlertDialogBody>
              Haluatko varmasti poistaa käyttäjän{" "}
              <Text as="span" fontWeight="bold">
                {userToDelete?.name || userToDelete?.email}
              </Text>
              ? Tätä toimintoa ei voi perua.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Peruuta
              </Button>
              <Button
                colorScheme={buttonColors.danger}
                onClick={handleDeleteConfirm}
                ml={3}
              >
                Poista
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  );
};

export default Admin;
