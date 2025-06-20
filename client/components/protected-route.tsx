import { ReactNode, useContext } from "react";
import { AuthContext } from "../contexts/auth";
import { loginRoute } from "../pages/login";
import { Navigate } from "@tanstack/react-router";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  // Safety: Context should exist, because provider is mounted at root.
  const { user } = useContext(AuthContext)!;
  if (!user) {
    // user is not authenticated
    return <Navigate to={loginRoute.to} />;
  }
  return children;
}
