import { createRoute, useNavigate } from "@tanstack/react-router";
import {
  Box,
  Button,
  Center,
  Heading,
  Stack,
  useColorModeValue,
  Text,
  Spinner,
} from "@chakra-ui/react";

import { rootRoute } from "./root";
import { useContext, useEffect } from "react";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";

export function Login() {
  const navigate = useNavigate();
  const { login, user, isLoading } = useContext(AuthContext)!;

  useEffect(() => {
    if (user) {
      navigate({ to: landingRoute.to });
    }
  }, [user]);

  const bg = useColorModeValue("gray.900", "gray.900");
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

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
          {isLoading ? (
            <>
              <Text color={accent} fontWeight="bold" fontSize="xl">
                Logging in...
              </Text>
              <Spinner color={accent} size="xl" />
            </>
          ) : (
            <>
              <Heading color={accent} fontWeight="extrabold" fontSize="2xl">
                Login
              </Heading>
              <Text color="gray.300" fontSize="md">
                Please authenticate to continue.
              </Text>
              <Button
                colorScheme="teal"
                size="lg"
                fontWeight="bold"
                onClick={login}
                px={8}
              >
                Login with GitHub
              </Button>
            </>
          )}
        </Stack>
      </Center>
    </Box>
  );
}

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});
