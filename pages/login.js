import Auth from "./auth";
import Router from "next/router";
import { useSession } from "next-auth/react";
import { Heading } from "@chakra-ui/react";

export default function Login() {
  const { data: session } = useSession();

  if (session) {
    Router.push(
      (Router.query.from && decodeURIComponent(Router.query.from)) || "/",
    );
  }

  return (
    <>
      <Heading>Kirjaudu sisään</Heading>
      <p>Käyttääksesi KLAPIa sinun tulee kirjautua palveluun.</p>
      <br />
      <Auth />
    </>
  );
}
