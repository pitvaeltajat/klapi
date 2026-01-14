import NextLink from "next/link";
import {
  Box,
  Button,
  Heading,
  Link,
  Table,
  Switch,
  IconButton,
  useDisclosure,
  Dialog,
  VStack,
  HStack,
  Text,
  Badge,
  Flex,
} from "@chakra-ui/react";

import { FaPlus } from "react-icons/fa";

import { toaster, Toaster } from "@/components/ui/toaster";

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

      toaster.create({
        title: "Rooli päivitetty",
        description: `Käyttäjän rooli vaihdettu: ${newGroup}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      mutate("/api/user/getUsers");
    } catch {
      toaster.create({
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
  const { open, onOpen, onClose } = useDisclosure();
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

      toaster.create({
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
    } catch {
      toaster.create({
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
    <VStack gap={spacing.sectionSpacing} align="stretch">
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

        <Table.ScrollArea>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Nimi</Table.ColumnHeader>
                <Table.ColumnHeader>Sähköposti</Table.ColumnHeader>
                <Table.ColumnHeader>Rooli</Table.ColumnHeader>
                <Table.ColumnHeader>Admin-oikeudet</Table.ColumnHeader>
                <Table.ColumnHeader width="100px">Toiminnot</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.map((user) => (
                <Table.Row key={user.id}>
                  <Table.Cell fontWeight="medium">
                    {user.name || "-"}
                  </Table.Cell>
                  <Table.Cell>{user.email}</Table.Cell>
                  <Table.Cell>{getGroupBadge(user.group)}</Table.Cell>
                  <Table.Cell>
                    <RoleSwitch user={user} />
                  </Table.Cell>
                  <Table.Cell>
                    <IconButton
                      aria-label="Poista käyttäjä"
                      colorScheme={buttonColors.danger}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(user)}
                      disabled={user.id === session?.user?.id}
                      title={
                        user.id === session?.user?.id
                          ? "Et voi poistaa itseäsi"
                          : "Poista käyttäjä"
                      }
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root
        role="alertdialog"
        isOpen={open}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header fontSize="lg" fontWeight="bold">
              Poista käyttäjä
            </Dialog.Header>

            <Dialog.Body>
              Haluatko varmasti poistaa käyttäjän{" "}
              <Text as="span" fontWeight="bold">
                {userToDelete?.name || userToDelete?.email}
              </Text>
              ? Tätä toimintoa ei voi perua.
            </Dialog.Body>

            <Dialog.Footer>
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
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  );
};

export default Admin;
