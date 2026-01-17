import {
  Box,
  Input,
  InputGroup,
  InputRightElement,
  List,
  ListItem,
  Text,
  useOutsideClick,
} from '@chakra-ui/react';
import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface LoanerAutocompleteProps {
  value: string;
  onChange: (value: string, userId?: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  isRequired?: boolean;
  showValidationFeedback?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function LoanerAutocomplete({
  value,
  onChange,
  placeholder = 'Syötä nimesi tai valitse sähköposti',
  size = 'md',
  isRequired = false,
  showValidationFeedback = false,
  autoFocus = false,
  onKeyDown,
}: LoanerAutocompleteProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOutsideClick({
    ref: dropdownRef,
    handler: () => setShowDropdown(false),
  });

  useEffect(() => {
    // Fetch users on component mount
    fetch('/api/users/getUsers')
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error('Failed to fetch users:', err));
  }, []);

  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(value.toLowerCase()),
  );

  const handleUserSelect = (user: User) => {
    setSelectedUserId(user.id);
    setShowDropdown(false);
    onChange(user.email || '', user.id);
  };

  const handleInputChange = (newValue: string) => {
    setSelectedUserId(undefined); // Clear selection when typing freeform
    setShowDropdown(true);
    onChange(newValue, undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredUsers.length === 1) {
      e.preventDefault();
      handleUserSelect(filteredUsers[0]);
    }
  };

  return (
    <Box position="relative" ref={dropdownRef}>
      <InputGroup size={size}>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={(e) => {
            handleKeyDown(e);
            onKeyDown?.(e);
          }}
          bg={selectedUserId ? 'green.50' : 'white'}
          borderColor={selectedUserId ? 'green.300' : undefined}
          isRequired={isRequired}
          autoFocus={autoFocus}
        />
        <InputRightElement>
          <FaChevronDown color="gray.500" />
        </InputRightElement>
      </InputGroup>

      {showDropdown && filteredUsers.length > 0 && (
        <List
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
            <ListItem
              key={user.id}
              px={4}
              py={3}
              cursor="pointer"
              _hover={{ bg: 'blue.50' }}
              onClick={() => handleUserSelect(user)}
              borderBottomWidth="1px"
              _last={{ borderBottom: 'none' }}
            >
              <Text fontWeight="medium">{user.email}</Text>
              {user.name && (
                <Text fontSize="sm" color="gray.600">
                  {user.name}
                </Text>
              )}
            </ListItem>
          ))}
        </List>
      )}

      {showValidationFeedback && (
        <Text fontSize="sm" mt={1} color={selectedUserId ? 'green.600' : 'gray.600'}>
          {selectedUserId
            ? '✓ Käyttäjä valittu. Varaus yhdistetään tähän tiliin.'
            : 'Valitse sähköposti listalta tai kirjoita vapaamuotoinen nimi.'}
        </Text>
      )}
    </Box>
  );
}
