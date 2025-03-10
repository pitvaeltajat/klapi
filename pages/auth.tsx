import { useSession, signIn, signOut } from "next-auth/react";
import { Button, Spinner } from "@chakra-ui/react";
import type { FC } from "react";

const Auth: FC = () => {
  const { data: session, status } = useSession();
  if (session) {
    return (
      <>
        <Button colorScheme="blue" onClick={() => signOut()}>
          Kirjaudu ulos
        </Button>
      </>
    );
  }
  return (
    <>
      <Button
        colorScheme="blue"
        onClick={() => signIn()}
        isDisabled={status === "loading"}
      >
        Kirjaudu sisään
        <Spinner display={status === "loading" ? "block" : "none"} />
      </Button>
    </>
  );
};

export default Auth;
