'use client';

import React from 'react';
import NextLink from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function NotAuthenticated() {
  return (
    <EmptyState
      title="Ei käyttöoikeutta"
      action={
        <Button asChild>
          <NextLink href="/">Palaa etusivulle</NextLink>
        </Button>
      }
    />
  );
}
