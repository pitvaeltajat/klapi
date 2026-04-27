'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

const sizeClasses = {
  sm: 'h-9 text-sm',
  md: 'h-10 text-sm',
  lg: 'h-12 text-base',
};

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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
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
    setSelectedUserId(undefined);
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
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={(e) => {
            handleKeyDown(e);
            onKeyDown?.(e);
          }}
          required={isRequired}
          autoFocus={autoFocus}
          className={cn(
            sizeClasses[size],
            'pr-9',
            selectedUserId && 'border-success bg-success/10',
          )}
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <FaChevronDown />
        </div>
      </div>

      {showDropdown && filteredUsers.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-[300px] overflow-y-auto rounded-md border bg-popover shadow-lg">
          {filteredUsers.map((user) => (
            <li
              key={user.id}
              className="cursor-pointer border-b px-4 py-3 last:border-b-0 hover:bg-accent"
              onClick={() => handleUserSelect(user)}
            >
              <div className="font-medium">{user.email}</div>
              {user.name && <div className="text-sm text-muted-foreground">{user.name}</div>}
            </li>
          ))}
        </ul>
      )}

      {showValidationFeedback && (
        <p
          className={cn(
            'mt-1 text-sm',
            selectedUserId ? 'text-success' : 'text-muted-foreground',
          )}
        >
          {selectedUserId
            ? '✓ Käyttäjä valittu. Laina yhdistetään tähän tiliin.'
            : 'Valitse sähköposti listalta tai kirjoita vapaamuotoinen nimi.'}
        </p>
      )}
    </div>
  );
}
