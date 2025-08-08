import { createRoute, Navigate, useSearch } from "@tanstack/react-router";
import {
  Box,
  Center,
  Stack,
  useColorModeValue,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";

import { rootRoute } from "./root";
import { getAuthCallbackGithub } from "../utils/fetch";
import { loginRoute } from "./login";
import { landingRoute } from "./landing";
import { useContext } from "react";
import { AuthContext } from "../contexts/auth";

export function AuthCallbackGithub() {
  const { code, state } = useSearch({ from: authCallbackGithubRoute.fullPath });
  const { checkLoginUser } = useContext(AuthContext)!;
  const callbackQuery = useQuery({
    queryKey: ["github_callback"],
    enabled: !!code && !!state,
    queryFn: async () => {
      await getAuthCallbackGithub({ code, state });
      return checkLoginUser();
    },
    retry: false,
  });

  const bg = useColorModeValue("black", "black");
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  if (callbackQuery.isPending) {
    return (
      <Box minH="100vh" bg={bg}>
        <Center minH="100vh">
          <Stack
            spacing={8}
            w="full"
            maxW="md"
            bg={cardBg}
            borderRadius="xl"
            boxShadow="lg"
            p={8}
            align="center"
          >
            <Text color={accent} fontWeight="bold" fontSize="xl">
              Logging in...
            </Text>
            <Spinner color={accent} size="xl" />
          </Stack>
        </Center>
      </Box>
    );
  }

  if (callbackQuery.isError) {
    return (
      <Navigate
        to={loginRoute.to}
        search={{ error: callbackQuery.error.message }}
      />
    );
  }

  if (callbackQuery.isSuccess) {
    return <Navigate to={landingRoute.to} />;
  }

  return (
    <Box minH="100vh" bg={bg}>
      <Center minH="100vh">
        <Stack
          spacing={8}
          w="full"
          maxW="md"
          bg={cardBg}
          borderRadius="xl"
          boxShadow="lg"
          p={8}
          align="center"
        >
          <Text color={accent} fontWeight="bold" fontSize="xl">
            Logging in...
          </Text>
          <Spinner color={accent} size="xl" />
        </Stack>
      </Center>
    </Box>
  );
}

export const authCallbackGithubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/callback/github",
  component: AuthCallbackGithub,
});
