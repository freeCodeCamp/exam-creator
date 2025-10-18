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
  Flex,
  Spinner,
  SimpleGrid,
} from "@chakra-ui/react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useContext, useEffect } from "react";

import { rootRoute } from "./root";
import { ProtectedRoute } from "../components/protected-route";
import {
  UsersWebSocketActivityContext,
  UsersWebSocketUsersContext,
} from "../contexts/users-websocket";
import { useUsersOnPath } from "../hooks/use-users-on-path";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";
import { useQuery } from "@tanstack/react-query";
import { getGenerations } from "../utils/fetch";

export function Generations() {
  const { logout } = useContext(AuthContext)!;
  const { error: usersError } = useContext(UsersWebSocketUsersContext)!;
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const navigate = useNavigate();

  const generationsQuery = useQuery({
    queryKey: ["generations"],
    queryFn: () => getGenerations(),
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

  const { users: usersOnPage } = useUsersOnPath("/generations");

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
                Exam Generations
              </Heading>
              <Text color="gray.300" fontSize="lg">
                Explore generated exams.
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
            {generationsQuery.isPending ? (
              <Center py={12}>
                <Spinner color={accent} size="xl" />
              </Center>
            ) : generationsQuery.isError ? (
              <Center>
                <Text color="red.400" fontSize="lg">
                  {generationsQuery.error.message}
                </Text>
              </Center>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
                {generationsQuery.data.map(
                  ({ generatedExam, databaseEnvironments }) => (
                    <GenerationCard
                      key={generatedExam.id}
                      generatedExam={generatedExam}
                      databaseEnvironments={databaseEnvironments}
                    />
                  )
                )}
              </SimpleGrid>
            )}
          </Box>
        </Stack>
      </Center>
    </Box>
  );
}

export const generationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/generations",
  component: () => (
    <ProtectedRoute>
      <Generations />
    </ProtectedRoute>
  ),
});
