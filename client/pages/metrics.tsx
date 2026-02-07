import {
  Box,
  Button,
  Center,
  HStack,
  Spinner,
  Stack,
  Text,
  SimpleGrid,
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
import { Header } from "../components/ui/header";

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
          <Header title="Exam Metrics" description="View metrics for exams" />
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
