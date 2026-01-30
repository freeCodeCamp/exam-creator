import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./contexts/auth";
import { UsersWebSocketProvider } from "./contexts/users-websocket";

import "./index.css";
import { queryClient, router } from "./contexts";
import { system } from "./theme";
import { ColorModeProvider } from "./color-mode";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <ColorModeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <UsersWebSocketProvider>
              <main>
                <RouterProvider router={router}></RouterProvider>
              </main>
            </UsersWebSocketProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ColorModeProvider>
    </ChakraProvider>
  </React.StrictMode>,
);
