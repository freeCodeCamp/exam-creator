import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
  SimpleGrid,
  Flex,
  Avatar,
} from "@chakra-ui/react";
import { useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createRoute, useNavigate } from "@tanstack/react-router";

import { rootRoute } from "./root";
import { getExamsMetrics } from "../utils/fetch";
import { ProtectedRoute } from "../components/protected-route";
import { UsersWebSocketActivityContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";
import { ExamMetricsCard } from "../components/exam-metrics-card";
import { DatabaseStatus } from "../components/database-status";
import { useUsersOnPath } from "../hooks/use-users-on-path";
import { Tooltip } from "../components/tooltip";

export function Metrics() {
  const { user, logout } = useContext(AuthContext)!;
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const navigate = useNavigate();

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    enabled: !!user,
    queryFn: () => getExamsMetrics(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  const bg = "black";
  const cardBg = "gray.800";
  const accent = "teal.300";

  return (
    <Box minH="100vh" bg={bg} py={12} px={4}>
      <HStack position="fixed" top={3} left={8} zIndex={101} gap={3}>
        <DatabaseStatus />
        <Button
          colorPalette="teal"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: landingRoute.to })}
        >
          Back to Dashboard
        </Button>
        <Button
          colorPalette="red"
          variant="outline"
          size="sm"
          onClick={() => logout()}
        >
          Logout
        </Button>
      </HStack>
      <Center>
        <Stack gap={8} w="full" maxW="7xl">
          <Flex
            justify="space-between"
            align="center"
            bg={cardBg}
            borderRadius="xl"
            p={8}
            boxShadow="lg"
            mb={4}
          >
            <Stack gap={1}>
              <Heading color={accent} fontWeight="extrabold" fontSize="3xl">
                Exam Metrics
              </Heading>
              <Text color="gray.300" fontSize="lg">
                View metrics for exams.
              </Text>
            </Stack>
            <UsersOnPageAvatars />
          </Flex>
          <Box>
            {metricsQuery.isPending ? (
              <Center py={12}>
                <Spinner color={accent} size="xl" />
              </Center>
            ) : metricsQuery.isError ? (
              <Center>
                <Text color="red.400" fontSize="lg">
                  {metricsQuery.error.message}
                </Text>
              </Center>
            ) : (
              <SimpleGrid minChildWidth={"380px"} gap={8}>
                {metricsQuery.data.map(({ exam, numberOfAttempts }) => (
                  <ExamMetricsCard
                    key={exam.id}
                    exam={exam}
                    numberOfAttempts={numberOfAttempts}
                  />
                ))}
              </SimpleGrid>
            )}
          </Box>
        </Stack>
      </Center>
    </Box>
  );
}

function UsersOnPageAvatars() {
  const { users: usersOnPage, error: usersError } = useUsersOnPath("/metrics");
  const bg = "black";

  return (
    <HStack gap={-2} ml={4}>
      {usersError ? (
        <Text color="red.400" fontSize="sm">
          {usersError.message}
        </Text>
      ) : (
        usersOnPage.slice(0, 5).map((user, idx) => (
          <Avatar.Root
            key={user.email}
            size="md"
            border="2px solid"
            borderColor={bg}
            zIndex={5 - idx}
            ml={idx === 0 ? 0 : -3}
            boxShadow="md"
          >
            <Avatar.Image src={user.picture ?? undefined} />
            <Tooltip content={user.name}>
              <Avatar.Fallback name={user.name} />
            </Tooltip>
          </Avatar.Root>
        ))
      )}
      {usersOnPage.length > 5 && (
        <Avatar.Root
          size="md"
          bg="gray.700"
          color="gray.200"
          ml={-3}
          zIndex={0}
        >
          <Avatar.Fallback name={`+${usersOnPage.length - 5} more`}>
            +{usersOnPage.length - 5}
          </Avatar.Fallback>
        </Avatar.Root>
      )}
    </HStack>
  );
}

export const metricsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/metrics",
  component: () => (
    <ProtectedRoute>
      <Metrics />
    </ProtectedRoute>
  ),
});
