import { Select, Box, Heading, Text } from "@chakra-ui/react";
import { User } from "@prisma/client";
import { useDates } from "@/contexts/DatesContext";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function UserSelector() {
  const { data: session } = useSession();
  const { state: dates, setSelectedUserId } = useDates();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (session?.user?.isAdmin) {
        try {
          const response = await fetch("/api/user/getUsers");
          const data = await response.json();
          setUsers(data);
        } catch (error) {
          console.error("Failed to fetch users:", error);
        }
      }
    };
    fetchUsers();
  }, [session?.user?.isAdmin]);

  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <Box mb={4}>
      <Heading size="md">Valitse käyttäjä</Heading>
      <Text>
        Valitse käyttäjä, jonka nouto- ja palautusajankohdat haluat määrittää.
      </Text>
      <Heading size="sm">Käyttäjät</Heading>
      <Select
        placeholder="Valitse käyttäjä"
        value={dates.selectedUserId || ""}
        onChange={(e) => setSelectedUserId(e.target.value)}
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.email}
          </option>
        ))}
      </Select>
    </Box>
  );
}
