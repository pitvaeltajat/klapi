import useSWR, { useSWRConfig } from 'swr';
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
} from '@chakra-ui/react';

import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../components/NotAuthenticated';

function RoleSwitch({ user }) {
    const { mutate } = useSWRConfig();

    const updateRole = async (userId, group) => {
        if (group === 'ADMIN') {
            await fetch(`/api/user/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    group: 'USER',
                }),
            });
        } else {
            await fetch(`/api/user/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    group: 'ADMIN',
                }),
            });
        }
    };

    return (
        <Switch
            isChecked={user.group === 'ADMIN'}
            onChange={async () => {
                mutate('/api/user/getUsers', updateRole(user.id, user.group));
            }}
        />
    );
}

export default function ManageUsers() {
    const { data: session } = useSession();
    const { data: users, error } = useSWR('/api/user/getUsers');

    if (session?.user?.group !== 'ADMIN') {
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
}
