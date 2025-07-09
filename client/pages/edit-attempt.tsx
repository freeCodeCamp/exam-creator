import { useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createRoute, useParams, useNavigate } from "@tanstack/react-router";
import {
  Box,
  Button,
  Center,
  Text,
  useColorModeValue,
  Avatar,
  Tooltip,
  HStack,
  Spinner,
} from "@chakra-ui/react";

import { rootRoute } from "./root";
import { ProtectedRoute } from "../components/protected-route";
import { UsersWebSocketContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { getAttemptById } from "../utils/fetch";
import { attemptsRoute } from "./attempts";

function Edit() {
  const { id } = useParams({ from: "/attempt/$id" });
  const { user, logout } = useContext(AuthContext)!;

  const navigate = useNavigate();

  const attemptQuery = useQuery({
    queryKey: ["attempt", id],
    enabled: !!user,
    queryFn: () => getAttemptById(id!),
    retry: false,
    // TODO: This does not work, because it overwrites the current edit before a save
    //       Somehow, the client must always PUT before GET
    //       Potentially, a PATCH request must be used with only the changed data to prevent unwanted overwrites
    // refetchInterval: 5000,
  });

  const bg = useColorModeValue("gray.900", "gray.900");
  const spinnerColor = useColorModeValue("teal.400", "teal.300");

  return (
    <Box minH="100vh" bg={bg} py={8} px={2} position="relative">
      <HStack position="fixed" top={6} left={8} zIndex={101} spacing={3}>
        <Button
          colorScheme="teal"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: attemptsRoute.to })}
        >
          Back to Attempts
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
      {/* Floating widget: top right */}
      <UsersEditing />
      <Center>
        {attemptQuery.isPending ? (
          <Spinner color={spinnerColor} size="xl" />
        ) : attemptQuery.isError ? (
          <Text color="red.400" fontSize="lg">
            Error loading exam: {attemptQuery.error.message}
          </Text>
        ) : (
          <EditAttempt attempt={attemptQuery.data} />
        )}
      </Center>
    </Box>
  );
}

function UsersEditing() {
  const {
    users,
    error: usersError,
    updateActivity,
  } = useContext(UsersWebSocketContext)!;

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  const filteredUsers = users.filter((u) => {
    const usersPath = u.activity.page.pathname;
    return usersPath === window.location.pathname;
  });

  const cardBg = useColorModeValue("gray.800", "gray.800");
  const avatarTextColor = useColorModeValue("gray.100", "gray.200");
  return (
    <Box
      position="fixed"
      top={4}
      right="16rem"
      zIndex={100}
      bg={cardBg}
      borderRadius="xl"
      boxShadow="lg"
      px={2}
      py={2}
      display="flex"
      alignItems="center"
      gap={4}
    >
      <HStack spacing={-2}>
        {usersError ? (
          <Text color="red.400" fontSize="sm">
            {usersError.message}
          </Text>
        ) : (
          filteredUsers.map((user, idx) => (
            <Tooltip label={user.name} key={user.email}>
              <Avatar
                src={user.picture}
                name={user.name}
                textColor={avatarTextColor}
                size="sm"
                border="2px solid"
                borderColor={cardBg}
                zIndex={5 - idx}
                ml={idx === 0 ? 0 : -2}
                boxShadow="md"
              />
            </Tooltip>
          ))
        )}
      </HStack>
    </Box>
  );
}

function EditAttempt({ attempt: _attempt }: { attempt: unknown }) {
  return <h1>Edit Attempt</h1>;
}

export const editAttemptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/attempt/$id",
  component: () => (
    <ProtectedRoute>
      <Edit />
    </ProtectedRoute>
  ),
});
