import React from "react";
import { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { useToast, ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider } from "next-themes";
import Layout from "../components/Layout";
import RedirectUnauthorized from "../components/RedirectUnauthorized";
import theme from "../styles/theme";
import { CartProvider } from "../contexts/CartContext";
import { DatesProvider } from "../contexts/DatesContext";

const fetcher = (...args: Parameters<typeof fetch>) =>
  fetch(...args).then((res) => res.json());

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps) {
  const toast = useToast();

  return (
    <SessionProvider session={session}>
      <RedirectUnauthorized router={router}>
        <SWRConfig
          value={{
            fetcher,
            onError: (error) => {
              if (error.status !== 403 && error.status !== 404) {
                toast({
                  title: "Error",
                  description: error.message,
                  status: "error",
                  duration: 5000,
                  isClosable: true,
                });
              }
            },
          }}
        >
          <DatesProvider>
            <CartProvider>
              <ChakraProvider theme={theme}>
                <ThemeProvider>
                  <Layout>
                    <Component {...pageProps} />
                  </Layout>
                </ThemeProvider>
              </ChakraProvider>
            </CartProvider>
          </DatesProvider>
        </SWRConfig>
      </RedirectUnauthorized>
    </SessionProvider>
  );
}
