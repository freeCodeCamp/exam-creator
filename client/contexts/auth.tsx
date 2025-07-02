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
  checkLoginUser: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function checkLoginUser() {
    try {
      const sessionUser = await getSessionUser();
      setUser(sessionUser);
    } catch (e) {
      console.debug(e);
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
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
      checkLoginUser,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
