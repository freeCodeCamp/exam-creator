import { createContext, useEffect, useMemo, useState } from "react";
import { SessionUser } from "../types";
import {
  getSessionUser,
  loginWithGitHub,
  logout as deleteLogout,
} from "../utils/fetch";

export const AuthContext = createContext<{
  user: SessionUser | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function checkLoginUser() {
    try {
      const sessionUser = await getSessionUser();
      setUser(sessionUser);
    } catch (e) {
      console.error(e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    checkLoginUser();
  }, []);

  const login = async () => {
    await loginWithGitHub();
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await deleteLogout();
      setUser(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
