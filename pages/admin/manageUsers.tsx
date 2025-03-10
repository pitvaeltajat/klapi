import useSWR, { useSWRConfig } from "swr";
import {
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Switch,
} from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import NotAuthenticated from "../../components/NotAuthenticated";
import type { NextPage } from "next";
import type { User } from "@prisma/client";

interface UserWithGroup extends User {
  group: "ADMIN" | "USER";
}

interface RoleSwitchProps {
  user: UserWithGroup;
}

const RoleSwitch: React.FC<RoleSwitchProps> = ({ user }) => {
  const { mutate } = useSWRConfig();

  const updateRole = async (userId: string, group: "ADMIN" | "USER") => {
    if (group === "ADMIN") {
      await fetch(`/api/user/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          group: "USER",
        }),
      });
    } else {
      await fetch(`/api/user/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          group: "ADMIN",
        }),
      });
    }
  };

  return (
    <Switch
      isChecked={user.group === "ADMIN"}
      onChange={async () => {
        mutate("/api/user/getUsers", updateRole(user.id, user.group));
      }}
    />
  );
};

const ManageUsers: NextPage = () => {
  const { data: session } = useSession();
  const { data: users, error } = useSWR<UserWithGroup[]>("/api/user/getUsers");

  if (session?.user?.group !== "ADMIN") {
    return <NotAuthenticated />;
  }

  if (error) {
    return <div>Failed to load users</div>;
  }

  if (!users) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Heading>Hallitse käyttäjiä</Heading>
      <TableContainer>
        <Table>
          <Thead>
            <Tr>
              <Th>Nimi</Th>
              <Th>Sähköposti</Th>
              <Th>Admin</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users?.map((user) => {
              return (
                <Tr key={user.id}>
                  <Td>{user.name}</Td>
                  <Td>{user.email}</Td>
                  <Td>
                    <RoleSwitch user={user} />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
};

export default ManageUsers;
