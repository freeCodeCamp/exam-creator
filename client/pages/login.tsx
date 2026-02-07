import { createRoute, useNavigate, useSearch } from "@tanstack/react-router";
import {
  Box,
  Button,
  Center,
  Heading,
  Stack,
  Text,
  Spinner,
  Alert,
  CloseButton,
} from "@chakra-ui/react";

import { rootRoute } from "./root";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";

let DevSignInOptions: React.FC = () => null;
if (import.meta.env.MODE === "development") {
  DevSignInOptions = (await import("../components/dev-sign-in-options"))
    .DevSignInOptions;
}

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

  return (
    <Box minH="100vh">
      <Center minH="100vh">
        <Stack
          gap={8}
          w="full"
          maxW="md"
          borderRadius="xl"
          boxShadow="lg"
          p={8}
          align="center"
        >
          {error && (
            <Alert.Root status="error" borderRadius="md">
              <Alert.Indicator />
              <Text flex="1">{error}</Text>
              <CloseButton
                onClick={() => setError(null)}
                position="absolute"
                right="8px"
                top="8px"
              />
            </Alert.Root>
          )}
          {isLoading ? (
            <>
              <Text fontWeight="bold" fontSize="xl">
                Logging in...
              </Text>
              <Spinner color={"teal.focusRing"} size="xl" />
            </>
          ) : (
            <>
              <Heading fontWeight="extrabold" fontSize="2xl">
                Login
              </Heading>
              <Text fontSize="md">Please authenticate to continue.</Text>
              <Button
                colorPalette="teal"
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
