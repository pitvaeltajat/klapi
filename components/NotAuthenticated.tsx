import React from "react";
import { Heading, Button, Link } from "@chakra-ui/react";
import NextLink from "next/link";

export default function NotAuthenticated() {
  return (
    <>
      <Heading>Ei käyttöoikeutta</Heading>
      <NextLink href="/" passHref legacyBehavior>
        <Link>
          <Button>Palaa etusivulle</Button>
        </Link>
      </NextLink>
    </>
  );
}
