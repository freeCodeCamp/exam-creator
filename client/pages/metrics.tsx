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
import { UsersOnPageAvatars } from "../components/users-on-page-avatars";

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

  return (
    <Box minH="100vh" py={12} px={4}>
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
            bg="bg.subtle"
            justify="space-between"
            align="center"
            borderRadius="xl"
            p={8}
            boxShadow="lg"
            mb={4}
          >
            <Stack gap={1}>
              <Heading fontWeight="extrabold" fontSize="3xl">
                Exam Metrics
              </Heading>
              <Text color="gray.300" fontSize="lg">
                View metrics for exams.
              </Text>
            </Stack>
            <UsersOnPageAvatars path="/metrics" />
          </Flex>
          <Box>
            {metricsQuery.isPending ? (
              <Center py={12}>
                <Spinner color={"teal.focusRing"} size="xl" />
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

export const metricsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/metrics",
  component: () => (
    <ProtectedRoute>
      <Metrics />
    </ProtectedRoute>
  ),
});
