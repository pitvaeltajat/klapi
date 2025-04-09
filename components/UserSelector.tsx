import {
  Select,
  Box,
  Heading,
  Text,
  Card,
  CardBody,
  VStack,
  Skeleton,
  useColorModeValue,
} from "@chakra-ui/react";
import { User } from "@prisma/client";
import { useDates } from "@/contexts/DatesContext";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function UserSelector() {
  const { data: session } = useSession();
  const { state: dates, setSelectedUserId } = useDates();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const bgColor = useColorModeValue("white", "gray.800");

  useEffect(() => {
    const fetchUsers = async () => {
      if (session?.user?.isAdmin) {
        try {
          setIsLoading(true);
          const response = await fetch("/api/user/getUsers");
          const data = await response.json();
          setUsers(data);
        } catch (error) {
          console.error("Failed to fetch users:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchUsers();
  }, [session?.user?.isAdmin]);

  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <Card variant="outline" bg={bgColor} shadow="sm">
      <CardBody>
        <VStack spacing={4} align="stretch">
          <Box>
            <Heading size="md" mb={2}>
              Valitse käyttäjä
            </Heading>
            <Text color="gray.600">
              Valitse käyttäjä, jonka nouto- ja palautusajankohdat haluat
              määrittää.
            </Text>
          </Box>

          {isLoading ? (
            <Skeleton height="40px" />
          ) : (
            <Select
              placeholder="Valitse käyttäjä"
              value={dates.selectedUserId || ""}
              onChange={(e) => setSelectedUserId(e.target.value)}
              size="lg"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </Select>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
