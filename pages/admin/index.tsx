import NextLink from "next/link";
import { Button, Heading, Link } from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import NotAuthenticated from "../../components/NotAuthenticated";
import type { NextPage } from "next";

const Admin: NextPage = () => {
  const { data: session } = useSession();

  if (session?.user?.group !== "ADMIN") {
    return <NotAuthenticated />;
  }

  return (
    <>
      <Heading>Hallinta</Heading>
      <Link as={NextLink} href="/admin/createItem">
        <Button>Luo uusi kama</Button>
      </Link>
      <Link as={NextLink} href="/admin/manageUsers">
        <Button>Hallitse käyttäjiä</Button>
      </Link>
    </>
  );
};

export default Admin;
