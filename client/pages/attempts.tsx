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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { ChevronDownIcon } from "lucide-react";
import { ExamEnvironmentExamModerationStatus } from "@prisma/client";

import { rootRoute } from "./root";
import { ModerationCard } from "../components/moderation-card";
import { getModerations } from "../utils/fetch";
import { ProtectedRoute } from "../components/protected-route";
import {
  UsersWebSocketActivityContext,
  UsersWebSocketUsersContext,
} from "../contexts/users-websocket";
import { useUsersOnPath } from "../hooks/use-users-on-path";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";
import { DatabaseStatus } from "../components/database-status";

export function Attempts() {
  const { logout } = useContext(AuthContext)!;
  const { error: usersError } = useContext(UsersWebSocketUsersContext)!;
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const navigate = useNavigate();
  const search = useSearch({ from: attemptsRoute.to });

  const [filter, setFilter] = useState<ExamEnvironmentExamModerationStatus>(
    search.filter || "Pending"
  );

  const {
    data,
    error,
    isError,
    isPending,
    isSuccess,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["filteredModerations", filter],
    queryFn: ({ pageParam }) => {
      if (pageParam === null) {
        return [];
      }
      return getModerations({
        status: filter,
        limit: 5,
        skip: pageParam,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 5) {
        return null;
      }
      return allPages.flat().length;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  function handleFilterChange(status: ExamEnvironmentExamModerationStatus) {
    setFilter(status);
  }

  const bg = useColorModeValue("black", "black");
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  const { users: usersOnPage } = useUsersOnPath("/attempts");

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
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                {filter}
              </MenuButton>
              <MenuList backgroundColor="gray.800">
                {(["Pending", "Approved", "Denied"] as const).map((status) => {
                  return (
                    <MenuItem
                      key={status}
                      as={Button}
                      backgroundColor="gray.800"
                      borderRadius={0}
                      boxShadow="md"
                      color={"white"}
                      colorScheme="green"
                      fontWeight="bold"
                      isDisabled={isPending || isFetching}
                      isLoading={isPending || isFetching}
                      justifyContent={"flex-start"}
                      loadingText={"Filtering..."}
                      onClick={() => handleFilterChange(status)}
                      _hover={{ bg: "green.500" }}
                    >
                      {status}
                    </MenuItem>
                  );
                })}
              </MenuList>
            </Menu>
          </Flex>
          <Box>
            {isPending ? (
              <Center py={12}>
                <Spinner color={accent} size="xl" />
              </Center>
            ) : isError ? (
              <Center>
                <Text color="red.400" fontSize="lg">
                  {error.message}
                </Text>
              </Center>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 1, lg: 1 }} spacing={8}>
                {isSuccess &&
                  data.pages.flat().map((moderation, i, moderations) => {
                    const isLastCard = i === moderations.length - 1;
                    return (
                      <Box
                        key={moderation.id}
                        ref={isLastCard ? lastCardRef : undefined}
                      >
                        <ModerationCard
                          moderation={moderation}
                          filter={filter}
                        />
                      </Box>
                    );
                  })}
                {data?.pages?.length === 0 && (
                  <Center>
                    <Text color="gray.400" fontSize="lg">
                      No moderations found for "{filter}" status.
                    </Text>
                  </Center>
                )}
              </SimpleGrid>
            )}
            {isFetchingNextPage && (
              <Center py={6}>
                <Spinner color={accent} size="lg" />
              </Center>
            )}
            {!isFetchingNextPage && isSuccess && !hasNextPage && (
              <Center py={6}>
                <Text color="gray.400" fontSize="md">
                  No more moderations to load.
                </Text>
              </Center>
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
