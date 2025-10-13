import { useContext, useMemo } from "react";
import { UsersWebSocketUsersContext } from "../contexts/users-websocket";

export function useUsersOnPath(prefix: string) {
  const ctx = useContext(UsersWebSocketUsersContext)!;
  const { users, error } = ctx;
  const filtered = useMemo(() => {
    return users.filter((u) => u.activity.page.pathname?.startsWith(prefix));
  }, [users, prefix]);
  return { users: filtered, error };
}
