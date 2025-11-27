import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Stack,
  Text,
  useColorModeValue,
  Avatar,
  Tooltip,
  SimpleGrid,
  Flex,
} from "@chakra-ui/react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useContext, useEffect } from "react";

import { rootRoute } from "./root";
import { ProtectedRoute } from "../components/protected-route";
import {
  UsersWebSocketActivityContext,
  UsersWebSocketUsersContext,
} from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { useUsersOnPath } from "../hooks/use-users-on-path";
import { examsRoute } from "./exams";
import { attemptsRoute } from "./attempts";
import { LandingCard } from "../components/landing-card";
import { metricsRoute } from "./metrics";
import { AttemptsLandingCard } from "../components/attempt/landing-card";

export function Landing() {
  const { logout } = useContext(AuthContext)!;
  const { users, error: usersError } = useContext(UsersWebSocketUsersContext)!;
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const navigate = useNavigate();

  const bg = useColorModeValue("black", "black");
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  const { users: usersOnAttempts } = useUsersOnPath("/attempts");
  const { users: usersOnExams } = useUsersOnPath("/exams");
  const { users: usersOnMetrics } = useUsersOnPath("/metrics");

  return (
    <Box minH="100vh" bg={bg} py={12} px={4}>
      {/* Logout button top right */}
      <Button
        position="fixed"
        top={6}
        right={8}
        zIndex={101}
        colorScheme="red"
        variant="outline"
        size="sm"
        onClick={() => logout()}
      >
        Logout
      </Button>
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
                Exam Creator
              </Heading>
              <Text color="gray.300" fontSize="lg">
                Create and moderate exams and attempts.
              </Text>
            </Stack>
            <HStack spacing={-2} ml={4}>
              {usersError ? (
                <Text color="red.400" fontSize="sm">
                  {usersError.message}
                </Text>
              ) : (
                users.slice(0, 5).map((user, idx) => (
                  <Tooltip label={user.name} key={user.email}>
                    <Avatar
                      src={user.picture ?? undefined}
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
              {users.length > 5 && (
                <Avatar
                  size="md"
                  bg="gray.700"
                  color="gray.200"
                  ml={-3}
                  zIndex={0}
                  name={`+${users.length - 5} more`}
                >
                  +{users.length - 5}
                </Avatar>
              )}
            </HStack>
          </Flex>
          <Box>
            <SimpleGrid columns={{ base: 1, md: 1, lg: 2 }} spacing={8}>
              <Button
                onClick={() => navigate({ to: examsRoute.to })}
                _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
                borderRadius="xl"
                transition="all 0.15s"
                display="block"
                textAlign="left"
                variant="unstyled"
                w="full"
                h="auto"
                p={0}
              >
                <LandingCard filteredUsers={usersOnExams}>Exams</LandingCard>
              </Button>
              <Button
                onClick={() => navigate({ to: attemptsRoute.to })}
                _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
                borderRadius="xl"
                transition="all 0.15s"
                display="block"
                textAlign="left"
                variant="unstyled"
                w="full"
                h="auto"
                p={0}
                // disabled={true}
              >
                {/* <LandingCard filteredUsers={usersOnAttempts}>
                  Attempts
                </LandingCard> */}
                <AttemptsLandingCard filteredUsers={usersOnAttempts} />
              </Button>
              <Button
                onClick={() => navigate({ to: metricsRoute.to })}
                _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
                borderRadius="xl"
                transition="all 0.15s"
                display="block"
                textAlign="left"
                variant="unstyled"
                w="full"
                h="auto"
                p={0}
              >
                <LandingCard filteredUsers={usersOnMetrics}>
                  Exam Metrics (Beta)
                </LandingCard>
              </Button>
            </SimpleGrid>
          </Box>
        </Stack>
      </Center>
    </Box>
  );
}

export const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <ProtectedRoute>
      <Landing />
    </ProtectedRoute>
  ),
});
