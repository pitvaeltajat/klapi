import React from 'react';
import NextLink from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotAuthenticated() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Ei käyttöoikeutta</h1>
      <Button asChild className="mt-4">
        <NextLink href="/">Palaa etusivulle</NextLink>
      </Button>
    </>
  );
}
