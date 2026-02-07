import { Box, Button, Center, Stack, SimpleGrid } from "@chakra-ui/react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useContext, useEffect } from "react";

import { rootRoute } from "./root";
import { ProtectedRoute } from "../components/protected-route";
import { UsersWebSocketActivityContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { examsRoute } from "./exams";
import { attemptsRoute } from "./attempts";
import { LandingCard } from "../components/landing-card";
import { metricsRoute } from "./metrics";
import { AttemptsLandingCard } from "../components/attempt/landing-card";
import { Header } from "../components/ui/header";

export function Landing() {
  const { logout } = useContext(AuthContext)!;
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const navigate = useNavigate();

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  return (
    <Box minH="100vh" bg={"bg"} py={12} px={4}>
      {/* Logout button top right */}
      <Button
        position="fixed"
        top={3}
        right={8}
        zIndex={101}
        colorPalette="red"
        variant="outline"
        size="sm"
        onClick={() => logout()}
      >
        Logout
      </Button>
      <Center>
        <Stack gap={8} w="full" maxW="7xl">
          {/* <Flex
            justify="space-between"
            align="center"
            bg={"bg"}
            borderRadius="xl"
            p={8}
            boxShadow="lg"
            mb={4}
          >
            <Stack gap={1}>
              <Heading
                color={"fg.success"}
                fontWeight="extrabold"
                fontSize="3xl"
              >
                Exam Creator
              </Heading>
              <Text color="fg.muted" fontSize="lg">
                Create and moderate exams and attempts.
              </Text>
            </Stack>
            <UsersOnPageAvatars path="/" />
          </Flex> */}
          <Header
            title="Exam Creator"
            description="Create and moderate exams and attempts"
          />
          <Box>
            <SimpleGrid minChildWidth={"380px"} gap={8}>
              <Button
                onClick={() => navigate({ to: examsRoute.to })}
                _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
                borderRadius="xl"
                transition="all 0.15s"
                display="block"
                textAlign="left"
                variant="plain"
                w="full"
                h="auto"
                p={0}
                bg={"bg.subtle"}
              >
                <LandingCard path={"/exams"}>Exams</LandingCard>
              </Button>
              <Button
                onClick={() => navigate({ to: attemptsRoute.to })}
                _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
                borderRadius="xl"
                transition="all 0.15s"
                display="block"
                textAlign="left"
                variant="plain"
                w="full"
                h="auto"
                p={0}
                bg={"bg.subtle"}
              >
                <AttemptsLandingCard path={"/attempts"} />
              </Button>
              <Button
                onClick={() => navigate({ to: metricsRoute.to })}
                _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
                borderRadius="xl"
                transition="all 0.15s"
                display="block"
                textAlign="left"
                variant="plain"
                w="full"
                h="auto"
                p={0}
                bg={"bg.subtle"}
              >
                <LandingCard path={"/metrics"}>Exam Metrics</LandingCard>
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
