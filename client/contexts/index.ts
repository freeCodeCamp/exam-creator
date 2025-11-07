import { createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";

import { authCallbackGithubRoute } from "../pages/auth-callback-github";
import { attemptsRoute } from "../pages/attempts";
import { editAttemptRoute } from "../pages/edit-attempt";
import { editExamRoute } from "../pages/edit-exam";
import { examsRoute } from "../pages/exams";
import { landingRoute } from "../pages/landing";
import { loginRoute } from "../pages/login";
import { rootRoute } from "../pages/root";

export const queryClient = new QueryClient();

export const routeTree = rootRoute.addChildren([
  authCallbackGithubRoute,
  attemptsRoute,
  editAttemptRoute,
  editExamRoute,
  examsRoute,
  landingRoute,
  loginRoute,
]);

export const router = createRouter({ routeTree, context: { queryClient } });
