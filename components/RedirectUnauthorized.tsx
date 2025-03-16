import React, { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

interface RedirectUnauthorizedProps {
  children: ReactNode;
  router: ReturnType<typeof useRouter>;
}

const RedirectUnauthorized: React.FC<RedirectUnauthorizedProps> = ({
  router,
  children,
}) => {
  const { data: session, status } = useSession();
  const isBrowser = () => typeof window !== "undefined";

  if (
    status === "unauthenticated" &&
    isBrowser() &&
    router.pathname !== "/login"
  ) {
    router.push({
      pathname: "/login",
      query: { from: router.asPath },
    });
  }

  if (session || router.pathname === "/login") {
    return <>{children}</>;
  } else {
    return <>Ladataan...</>;
  }
};

export default RedirectUnauthorized;
