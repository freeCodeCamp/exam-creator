import { QueryClient } from "@tanstack/react-query";
import { rootRoute } from "../pages/root";
import { landingRoute } from "../pages/landing";
import { loginRoute } from "../pages/login";
import { editRoute } from "../pages/edit";
import { createRouter } from "@tanstack/react-router";

export const queryClient = new QueryClient();

export const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  editRoute,
]);

export const router = createRouter({ routeTree, context: { queryClient } });
