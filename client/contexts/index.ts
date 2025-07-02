import { createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";

import { authCallbackGithubRoute } from "../pages/auth-callback-github";
import { landingRoute } from "../pages/landing";
import { loginRoute } from "../pages/login";
import { rootRoute } from "../pages/root";
import { editRoute } from "../pages/edit";

export const queryClient = new QueryClient();

export const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  editRoute,
  authCallbackGithubRoute,
]);

export const router = createRouter({ routeTree, context: { queryClient } });
