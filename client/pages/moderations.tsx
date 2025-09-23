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
import { ModerationCard } from "../components/moderation-card";
import { getAttemptById, getModerations } from "../utils/fetch";
import { ProtectedRoute } from "../components/protected-route";
import { UsersWebSocketContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";
import { DatabaseStatus } from "../components/database-status";

export function Moderations() {
  const { user, logout } = useContext(AuthContext)!;
  const {
    users,
    error: usersError,
    updateActivity,
  } = useContext(UsersWebSocketContext)!;
  const navigate = useNavigate();

  const moderationsQuery = useQuery({
    queryKey: ["moderations"],
    enabled: !!user,
    queryFn: async () => {
      const moderations = await getModerations();
      const attempts = [];
      for (const moderation of moderations) {
        const attempt = await getAttemptById(moderation.examAttemptId);
        attempts.push({ ...moderation, config: attempt.config });
      }
      return attempts;
    },
    retry: false,
  });

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  const bg = useColorModeValue("black", "black");
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  const usersOnPage = users.filter((u) => {
    const usersPath = u.activity.page.pathname;
    // TODO: This might need to be `/attempts | /moderations`
    return usersPath.startsWith("/moderations");
  });

  return (
    <Box minH="100vh" bg={bg} py={12} px={4}>
      <HStack position="fixed" top={6} left={8} zIndex={101} spacing={3}>
        <DatabaseStatus />
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
            {moderationsQuery.isPending ? (
              <Center py={12}>
                <Spinner color={accent} size="xl" />
              </Center>
            ) : moderationsQuery.isError ? (
              <Center>
                <Text color="red.400" fontSize="lg">
                  {moderationsQuery.error.message}
                </Text>
              </Center>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 1, lg: 1 }} spacing={8}>
                {moderationsQuery.data.map((moderation) => (
                  <ModerationCard key={moderation.id} moderation={moderation} />
                ))}
              </SimpleGrid>
            )}
          </Box>
        </Stack>
      </Center>
    </Box>
  );
}

export const moderationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/moderations",
  component: () => (
    <ProtectedRoute>
      <Moderations />
    </ProtectedRoute>
  ),
});
