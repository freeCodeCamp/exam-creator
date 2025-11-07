import { createRoute, useNavigate, useSearch } from "@tanstack/react-router";
import {
  Box,
  Button,
  Center,
  Heading,
  Stack,
  useColorModeValue,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  CloseButton,
} from "@chakra-ui/react";

import { rootRoute } from "./root";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";

// If MOCK_AUTH == true, import and render DevSignInOptions
let DevSignInOptions: React.FC = () => null;
if (import.meta.env.MODE === "development") {
  DevSignInOptions = (await import("../components/dev-sign-in-options"))
    .DevSignInOptions;
}
console.log(import.meta.env.DEV);

export function Login() {
  const navigate = useNavigate();
  const search = useSearch({ from: loginRoute.fullPath });
  const { login, user, isLoading } = useContext(AuthContext)!;

  const [error, setError] = useState<string | null>(search.error);

  useEffect(() => {
    if (user) {
      navigate({ to: landingRoute.to });
    }
  }, [user]);

  const bg = useColorModeValue("black", "black");
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
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <Text flex="1">{error}</Text>
              <CloseButton
                onClick={() => setError(null)}
                position="absolute"
                right="8px"
                top="8px"
              />
            </Alert>
          )}
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
              <DevSignInOptions />
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
