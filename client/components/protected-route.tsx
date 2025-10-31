import { ReactNode, useContext } from "react";
import { AuthContext } from "../contexts/auth";
import { loginRoute } from "../pages/login";
import { Navigate } from "@tanstack/react-router";
import { Center, Spinner } from "@chakra-ui/react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  // Safety: Context should exist, because provider is mounted at root.
  const { user, isLoading } = useContext(AuthContext)!;

  if (isLoading) {
    // Wait for auth check to complete before deciding whether to redirect
    return (
      <Center minH="100vh" bg="black">
        <Spinner color="teal.400" size="xl" />
      </Center>
    );
  }
  if (!user) {
    // user is not authenticated
    return <Navigate to={loginRoute.to} />;
  }
  return children;
}
