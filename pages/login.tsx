import Auth from "./auth";
import Router from "next/router";
import { useSession } from "next-auth/react";
import { Heading } from "@chakra-ui/react";
import type { NextPage } from "next";

const Login: NextPage = () => {
  const { data: session } = useSession();

  if (session) {
    const from = Array.isArray(Router.query.from)
      ? Router.query.from[0]
      : Router.query.from;
    Router.push((from && decodeURIComponent(from)) || "/");
  }

  return (
    <>
      <Heading>Kirjaudu sisään</Heading>
      <p>Käyttääksesi KLAPIa sinun tulee kirjautua palveluun.</p>
      <br />
      <Auth />
    </>
  );
};

export default Login;
