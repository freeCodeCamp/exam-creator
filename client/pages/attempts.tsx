import {
  Box,
  Button,
  Center,
  HStack,
  Spinner,
  Stack,
  Text,
  SimpleGrid,
  Portal,
  Menu,
} from "@chakra-ui/react";
import { createRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useContext, useEffect, useRef, useCallback } from "react";
import { ChevronDownIcon } from "lucide-react";
import { ExamEnvironmentExamModerationStatus } from "@prisma/client";

import { rootRoute } from "./root";
import { ModerationCard } from "../components/moderation-card";
import { ProtectedRoute } from "../components/protected-route";
import { UsersWebSocketActivityContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";
import { DatabaseStatus } from "../components/database-status";
import { moderationsInfiniteQuery } from "../hooks/queries";
import { Header } from "../components/ui/header";

export function Attempts() {
  const { logout } = useContext(AuthContext)!;
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const navigate = useNavigate();
  const { filter: moderationStatusFilter, sort } = useSearch({
    from: attemptsRoute.to,
  });

  const setModerationStatusFilter = (
    filter: ExamEnvironmentExamModerationStatus,
  ) => {
    navigate({
      to: attemptsRoute.to,
      search: (prev: AttemptsSearch) => ({ ...prev, filter }),
    });
  };
  const setSort = (sort: number) => {
    navigate({
      to: attemptsRoute.to,
      search: (prev: AttemptsSearch) => ({ ...prev, sort }),
    });
  };
  // const [examFilter, setExamFilter] = useState<GetExam["exam"] | null>(null);

  // TODO: Could turn this into a mutation, and only fetch if filter is used
  // const examsQuery = useQuery({
  //   queryKey: ["exams"],
  //   queryFn: () => getExams(),
  //   retry: false,
  //   refetchOnWindowFocus: false,
  // });

  const mods = moderationsInfiniteQuery({ moderationStatusFilter, sort });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (mods.isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && mods.hasNextPage) {
          mods.fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [mods.isFetchingNextPage, mods.hasNextPage, mods.fetchNextPage],
  );

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
          {/* <Flex
            justify="space-between"
            align="center"
            bg="bg.panel"
            borderRadius="xl"
            p={8}
            boxShadow="lg"
            mb={4}
          >
            <Stack gap={1}>
              <Heading fontWeight="extrabold" fontSize="3xl">
                Exam Moderator
              </Heading>
              <Text fontSize="lg">Moderate exam attempts.</Text>
            </Stack>
            <UsersOnPageAvatars path="/attempts" /> */}
          <Header title="Exam Moderator" description="Moderate exam attempts">
            <HStack gap={2}>
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button>
                    {moderationStatusFilter}
                    <ChevronDownIcon />
                  </Button>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content>
                      {(["Pending", "Approved", "Denied"] as const).map(
                        (status) => {
                          return (
                            <Menu.Item
                              key={status}
                              value={status}
                              borderRadius={0}
                              boxShadow="md"
                              colorPalette="green"
                              fontWeight="bold"
                              justifyContent={"flex-start"}
                              _hover={{ bg: "green.500" }}
                            >
                              <Button
                                loadingText={"Filtering..."}
                                onClick={() =>
                                  setModerationStatusFilter(status)
                                }
                                disabled={mods.isPending || mods.isFetching}
                                loading={mods.isPending || mods.isFetching}
                              >
                                {status}
                              </Button>
                            </Menu.Item>
                          );
                        },
                      )}
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>
              {/* <Menu>
              <Menu.Button as={Button} rightIcon={<ChevronDownIcon />}>
              {examFilter?.config?.name ?? "All"}
              </Menu.Button>
              <MenuList backgroundColor="gray.800">
              <Menu.Item
              as={Button}
              backgroundColor="gray.800"
              borderRadius={0}
              boxShadow="md"
              color={"white"}
              colorPalette="green"
              fontWeight="bold"
              disabled={isPending || isFetching}
              isLoading={isPending || isFetching}
              justifyContent={"flex-start"}
              loadingText={"Filtering..."}
              onClick={() => setExamFilter(null)}
              _hover={{ bg: "green.500" }}
              >
              All
              </Menu.Item>
              {examsQuery.data?.map(({ exam }) => {
                return (
                  <Menu.Item
                  key={exam.id}
                  as={Button}
                  backgroundColor="gray.800"
                  borderRadius={0}
                  boxShadow="md"
                  color={"white"}
                  colorPalette="green"
                  fontWeight="bold"
                  disabled={isPending || isFetching}
                  isLoading={isPending || isFetching}
                  justifyContent={"flex-start"}
                  loadingText={"Filtering..."}
                  onClick={() => setExamFilter(exam)}
                  _hover={{ bg: "green.500" }}
                  >
                  {exam.config.name}
                  </Menu.Item>
                  );
                  })}
                  </MenuList>
                  </Menu> */}
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button>
                    {sort === 1 ? "Ascending" : "Descending"}
                    <ChevronDownIcon />
                  </Button>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content>
                      {(["Ascending", "Descending"] as const).map((name) => {
                        return (
                          <Menu.Item
                            asChild
                            key={name}
                            value={name}
                            // borderRadius={0}
                            boxShadow="md"
                            // colorPalette="green"
                            fontWeight="bold"
                            justifyContent={"flex-start"}
                            // _hover={{ bg: "green.500" }}
                          >
                            <Button
                              loadingText={"Filtering..."}
                              onClick={() =>
                                setSort(name === "Ascending" ? 1 : -1)
                              }
                              disabled={mods.isPending || mods.isFetching}
                              loading={mods.isPending || mods.isFetching}
                            >
                              {name}
                            </Button>
                          </Menu.Item>
                        );
                      })}
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>
              {/* <Field.Root>
              <FormLabel>Sort Order</FormLabel>
              <select
              value={sort}
              onChange={(e) => setSort(Number(e.target.value))}
              >
              <option value="1">Ascending</option>
              <option value="-1">Descending</option>
              </select>
              </Field.Root> */}
            </HStack>
          </Header>
          <Box>
            {mods.isPending ? (
              <Center py={12}>
                <Spinner color={"teal.focusRing"} size="xl" />
              </Center>
            ) : mods.isError ? (
              <Center>
                <Text color="red.400" fontSize="lg">
                  {mods.error.message}
                </Text>
              </Center>
            ) : (
              <SimpleGrid columns={1} gap={8}>
                {mods.isSuccess &&
                  mods.data.pages.flat().map((moderation, i, moderations) => {
                    const isLastCard = i === moderations.length - 1;
                    return (
                      <Box
                        key={moderation.id}
                        ref={isLastCard ? lastCardRef : undefined}
                      >
                        <ModerationCard
                          moderation={moderation}
                          filter={moderationStatusFilter}
                        />
                      </Box>
                    );
                  })}
                {mods.data?.pages?.length === 0 && (
                  <Center>
                    <Text color="gray.400" fontSize="lg">
                      No moderations found for "{moderationStatusFilter}"
                      status.
                    </Text>
                  </Center>
                )}
              </SimpleGrid>
            )}
            {mods.isFetchingNextPage && (
              <Center py={6}>
                <Spinner color={"teal.focusRing"} size="lg" />
              </Center>
            )}
            {!mods.isFetchingNextPage &&
              mods.isSuccess &&
              !mods.hasNextPage && (
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

interface AttemptsSearch {
  filter: ExamEnvironmentExamModerationStatus;
  sort: number;
}

export const attemptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/attempts",
  validateSearch: (search: Record<string, unknown>): AttemptsSearch => {
    const filters: ExamEnvironmentExamModerationStatus[] = [
      "Pending",
      "Approved",
      "Denied",
    ];
    return {
      filter: filters.includes(
        search.filter as ExamEnvironmentExamModerationStatus,
      )
        ? (search.filter as ExamEnvironmentExamModerationStatus)
        : "Pending",
      sort: Number(search.sort) === -1 ? -1 : 1,
    };
  },
  component: () => (
    <ProtectedRoute>
      <Attempts />
    </ProtectedRoute>
  ),
});
