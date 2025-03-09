import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { useToast, ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider } from "next-themes";

import store from "../redux/store";
import { Provider } from "react-redux";

import Layout from "../components/Layout";
import RedirectUnauthorized from "../components/RedirectUnauthorized";
import theme from "../styles/theme";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}) {
  const toast = useToast();

  return (
    <SessionProvider session={session}>
      <RedirectUnauthorized router={router}>
        <SWRConfig
          value={{
            fetcher,
            onError: (error, key) => {
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
          <Provider store={store}>
            <ChakraProvider theme={theme}>
              <ThemeProvider>
                <Layout>
                  <Component {...pageProps} />
                </Layout>
              </ThemeProvider>
            </ChakraProvider>
          </Provider>
        </SWRConfig>
      </RedirectUnauthorized>
    </SessionProvider>
  );
}
