import { createContext, useContext, useEffect, useRef, useState } from "react";
import { deserializeToPrisma } from "../utils/serde";
import { Activity, User } from "../types";
import { AuthContext } from "./auth";

export const UsersWebSocketContext = createContext<{
  users: User[];
  error: Error | null;
  updateActivity: (activity: Activity) => void;
} | null>(null);

export function UsersWebSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useContext(AuthContext)!;
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    setError(null);

    const ws = new WebSocket(`/ws/users?token=${user.webSocketToken}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "users-update" && Array.isArray(msg.data)) {
        const prismaData = deserializeToPrisma<User[]>(msg.data);
        const userData = prismaData.map((p) => ({
          ...p,
          activity: {
            ...p.activity,
            page: new URL(p.activity.page, window.location.origin),
          },
        }));
        setUsers(userData);
      }
    };

    ws.onopen = () => {
      setError(null);
      console.log("WebSocket connection established!");
    };

    ws.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      if (!event.wasClean) {
        setError(
          new Error(
            `Websocket closed uncleanly: ${event.code} - ${event.reason}`
          )
        );
      }
    };

    ws.onerror = (_event) => {
      setError(new Error("Websocket error"));
    };

    return () => {
      ws.close(1000, "Component unmounted");
    };
  }, [user]);

  function updateActivity(activity: Activity) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const jsonActivity = {
        ...activity,
        page: activity.page.pathname,
      };
      const msg = {
        type: "activity-update",
        data: jsonActivity,
      };
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current?.send(JSON.stringify(msg));
      }
    }, 1_000);
  }

  return (
    <UsersWebSocketContext.Provider value={{ users, error, updateActivity }}>
      {children}
    </UsersWebSocketContext.Provider>
  );
}
