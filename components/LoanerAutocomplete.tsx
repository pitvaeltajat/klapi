import { Box, Input, InputGroup, List, ListItem, Text } from "@chakra-ui/react";
import React, { useState, useRef, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface LoanerAutocompleteProps {
  value: string;
  onChange: (value: string, userId?: string) => void;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  isRequired?: boolean;
  showValidationFeedback?: boolean;
  autoFocus?: boolean;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function LoanerAutocomplete({
  value,
  onChange,
  placeholder = "Syötä nimesi tai valitse sähköposti",
  size = "md",
  isRequired = false,
  showValidationFeedback = false,
  autoFocus = false,
  onKeyPress,
}: LoanerAutocompleteProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch users on component mount
    fetch("/api/users/getUsers")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error("Failed to fetch users:", err));
  }, []);

  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(value.toLowerCase())
  );

  const handleUserSelect = (user: User) => {
    setSelectedUserId(user.id);
    setShowDropdown(false);
    onChange(user.email || "", user.id);
  };

  const handleInputChange = (newValue: string) => {
    setSelectedUserId(undefined); // Clear selection when typing freeform
    setShowDropdown(true);
    onChange(newValue, undefined);
  };

  return (
    <Box position="relative" ref={dropdownRef}>
      <InputGroup size={size}>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyPress={onKeyPress}
          bg={selectedUserId ? "green.50" : "white"}
          borderColor={selectedUserId ? "green.300" : undefined}
          required={isRequired}
          autoFocus={autoFocus}
        />
      </InputGroup>

      {showDropdown && filteredUsers.length > 0 && (
        <List.Root
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          bg="white"
          borderWidth="1px"
          borderRadius="md"
          boxShadow="lg"
          maxH="300px"
          overflowY="auto"
          zIndex={10}
        >
          {filteredUsers.map((user) => (
            <List.Item
              key={user.id}
              px={4}
              py={3}
              cursor="pointer"
              _hover={{ bg: "blue.50" }}
              onClick={() => handleUserSelect(user)}
              borderBottomWidth="1px"
              _last={{ borderBottom: "none" }}
            >
              <Text fontWeight="medium">{user.email}</Text>
              {user.name && (
                <Text fontSize="sm" color="gray.600">
                  {user.name}
                </Text>
              )}
            </List.Item>
          ))}
        </List.Root>
      )}

      {showValidationFeedback && (
        <Text
          fontSize="sm"
          mt={1}
          color={selectedUserId ? "green.600" : "gray.600"}
        >
          {selectedUserId
            ? "✓ Käyttäjä valittu. Varaus yhdistetään tähän tiliin."
            : "Valitse sähköposti listalta tai kirjoita vapaamuotoinen nimi."}
        </Text>
      )}
    </Box>
  );
}
