import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
  Avatar,
  Tooltip,
  SimpleGrid,
  Flex,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useContext, useEffect } from "react";

import { rootRoute } from "./root";
import { AttemptCard } from "../components/attempt-card";
import { getAttempts } from "../utils/fetch";
import { ProtectedRoute } from "../components/protected-route";
import { UsersWebSocketContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";

export function Attempts() {
  const { user, logout } = useContext(AuthContext)!;
  const {
    users,
    error: usersError,
    updateActivity,
  } = useContext(UsersWebSocketContext)!;
  const navigate = useNavigate();

  const attemptsQuery = useQuery({
    queryKey: ["attempts"],
    enabled: !!user,
    queryFn: () => getAttempts(),
    retry: false,
  });

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  const bg = useColorModeValue("gray.900", "gray.900");
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  const usersOnPage = users.filter((u) => {
    const usersPath = u.activity.page.pathname;
    return usersPath.startsWith("/attempt");
  });

  return (
    <Box minH="100vh" bg={bg} py={12} px={4}>
      <HStack position="fixed" top={6} left={8} zIndex={101} spacing={3}>
        <Button
          colorScheme="teal"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: landingRoute.to })}
        >
          Back to Dashboard
        </Button>
        <Button
          colorScheme="red"
          variant="outline"
          size="sm"
          onClick={() => logout()}
        >
          Logout
        </Button>
      </HStack>
      <Center>
        <Stack spacing={8} w="full" maxW="5xl">
          <Flex
            justify="space-between"
            align="center"
            bg={cardBg}
            borderRadius="xl"
            p={8}
            boxShadow="lg"
            mb={4}
          >
            <Stack spacing={1}>
              <Heading color={accent} fontWeight="extrabold" fontSize="3xl">
                Exam Moderator
              </Heading>
              <Text color="gray.300" fontSize="lg">
                Moderate exam attempts.
              </Text>
            </Stack>
            <HStack spacing={-2} ml={4}>
              {usersError ? (
                <Text color="red.400" fontSize="sm">
                  {usersError.message}
                </Text>
              ) : (
                usersOnPage.slice(0, 5).map((user, idx) => (
                  <Tooltip label={user.name} key={user.email}>
                    <Avatar
                      src={user.picture}
                      name={user.name}
                      size="md"
                      border="2px solid"
                      borderColor={bg}
                      zIndex={5 - idx}
                      ml={idx === 0 ? 0 : -3}
                      boxShadow="md"
                    />
                  </Tooltip>
                ))
              )}
              {usersOnPage.length > 5 && (
                <Avatar
                  size="md"
                  bg="gray.700"
                  color="gray.200"
                  ml={-3}
                  zIndex={0}
                  name={`+${usersOnPage.length - 5} more`}
                >
                  +{usersOnPage.length - 5}
                </Avatar>
              )}
            </HStack>
          </Flex>
          <Box>
            {attemptsQuery.isPending ? (
              <Center py={12}>
                <Spinner color={accent} size="xl" />
              </Center>
            ) : attemptsQuery.isError ? (
              <Center>
                <Text color="red.400" fontSize="lg">
                  {attemptsQuery.error.message}
                </Text>
              </Center>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
                {attemptsQuery.data.map((attempt) => (
                  <AttemptCard key={attempt.id} attempt={attempt} />
                ))}
              </SimpleGrid>
            )}
          </Box>
        </Stack>
      </Center>
    </Box>
  );
}

export const attemptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/attempts",
  component: () => (
    <ProtectedRoute>
      <Attempts />
    </ProtectedRoute>
  ),
});
