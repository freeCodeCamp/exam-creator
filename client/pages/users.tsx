import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Input,
  Menu,
  Portal,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { createRoute, useNavigate, useSearch } from "@tanstack/react-router";
import {
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, SearchIcon } from "lucide-react";

import { rootRoute } from "./root";
import { ProtectedRoute } from "../components/protected-route";
import { UsersWebSocketActivityContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";
import { DatabaseStatus } from "../components/database-status";
import { Header } from "../components/ui/header";
import { DeleteAttemptModal } from "../components/delete-attempt-modal";
import { getUserSearch, type UserSearchBy } from "../utils/fetch";
import {
  getPendingDeletes,
  scheduleDelete,
  subscribePendingDeletes,
} from "../utils/pending-deletes";

const SEARCH_FIELDS = [
  { key: "email", label: "Email" },
  { key: "username", label: "Username" },
  { key: "user_id", label: "User ID" },
  { key: "attempt_id", label: "Attempt ID" },
  { key: "moderation_id", label: "Moderation ID" },
] as const;

type SearchFieldKey = (typeof SEARCH_FIELDS)[number]["key"];

interface UsersSearch {
  field?: SearchFieldKey;
  value?: string;
}

function searchFieldLabel(key: SearchFieldKey): string {
  return SEARCH_FIELDS.find((f) => f.key === key)!.label;
}

const moderationStatusPalette = {
  Pending: "yellow",
  Approved: "green",
  Denied: "red",
} as const;

export function Users() {
  const { logout } = useContext(AuthContext)!;
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const navigate = useNavigate();

  const urlSearch = useSearch({ from: usersRoute.to });

  const [searchField, setSearchField] = useState<SearchFieldKey>(
    urlSearch.field ?? "email",
  );
  const [searchValue, setSearchValue] = useState(urlSearch.value ?? "");
  const [submittedSearch, setSubmittedSearch] = useState<UserSearchBy | null>(
    urlSearch.field && urlSearch.value
      ? ({ [urlSearch.field]: urlSearch.value } as UserSearchBy)
      : null,
  );

  // Sync search from URL params (e.g. arriving from the attempt page).
  useEffect(() => {
    if (urlSearch.field && urlSearch.value) {
      setSearchField(urlSearch.field);
      setSearchValue(urlSearch.value);
      setSubmittedSearch({
        [urlSearch.field]: urlSearch.value,
      } as UserSearchBy);
    }
  }, [urlSearch.field, urlSearch.value]);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  // Attempts scheduled for deletion, hidden optimistically. Module-scoped so
  // the undo window survives navigating away and back.
  const pending = useSyncExternalStore(
    subscribePendingDeletes,
    getPendingDeletes,
  );

  const search = useQuery({
    queryKey: ["user-search", submittedSearch],
    queryFn: () => getUserSearch(submittedSearch!),
    enabled: submittedSearch !== null,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const visibleAttempts = (search.data?.attempts ?? []).filter(
    (a) => !pending.has(a.id),
  );
  const visibleModerations = (search.data?.moderations ?? []).filter(
    (m) => !pending.has(m.examAttemptId),
  );

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  function submitSearch() {
    const value = searchValue.trim();
    if (!value) {
      return;
    }
    setSubmittedSearch({ [searchField]: value } as UserSearchBy);
  }

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
          <Header
            title="User Management"
            description="Look up a user's attempts and moderations"
          />
          <Flex
            as="form"
            gap={3}
            align="center"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
          >
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button minW="10rem">
                  {searchFieldLabel(searchField)}
                  <ChevronDownIcon />
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    {SEARCH_FIELDS.map(({ key, label }) => (
                      <Menu.Item
                        key={key}
                        value={key}
                        fontWeight="bold"
                        justifyContent="flex-start"
                        onClick={() => setSearchField(key)}
                      >
                        {label}
                      </Menu.Item>
                    ))}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
            <Input
              placeholder={`Search by ${searchFieldLabel(searchField)}...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <Button
              type="submit"
              colorPalette="teal"
              disabled={!searchValue.trim() || search.isFetching}
              loading={search.isFetching}
              loadingText="Searching..."
            >
              <SearchIcon />
              Search
            </Button>
          </Flex>
          {search.isPending && submittedSearch !== null ? (
            <Center py={12}>
              <Spinner color={"teal.focusRing"} size="xl" />
            </Center>
          ) : search.isError ? (
            <Center>
              <Text color="red.400" fontSize="lg">
                {search.error.message}
              </Text>
            </Center>
          ) : search.isSuccess ? (
            <Stack gap={8}>
              <Box bg="bg.subtle" borderRadius="xl" p={6} boxShadow="md">
                <Heading size="md" mb={4}>
                  User
                </Heading>
                <SimpleGrid minChildWidth="220px" gap={4}>
                  <Stack gap={0}>
                    <Text color="fg.muted" fontSize="sm">
                      Name
                    </Text>
                    <Text>{search.data.user.name ?? "-"}</Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text color="fg.muted" fontSize="sm">
                      Username
                    </Text>
                    <Text>{search.data.user.username ?? "-"}</Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text color="fg.muted" fontSize="sm">
                      Email
                    </Text>
                    <Text>{search.data.user.email ?? "-"}</Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text color="fg.muted" fontSize="sm">
                      User ID
                    </Text>
                    <Text fontFamily="mono">{search.data.user.id}</Text>
                  </Stack>
                </SimpleGrid>
              </Box>
              <Box bg="bg.subtle" borderRadius="xl" p={6} boxShadow="md">
                <Heading size="md" mb={4}>
                  Attempts ({visibleAttempts.length})
                </Heading>
                {visibleAttempts.length === 0 ? (
                  <Text color="fg.muted">No attempts found.</Text>
                ) : (
                  <Stack gap={3}>
                    {visibleAttempts.map((attempt) => (
                      <Flex
                        key={attempt.id}
                        justify="space-between"
                        align="center"
                        borderWidth="1px"
                        borderRadius="lg"
                        p={4}
                        gap={4}
                        wrap="wrap"
                      >
                        <Stack gap={0}>
                          <Text fontWeight="bold">{attempt.config.name}</Text>
                          <Text color="fg.muted" fontSize="sm" fontFamily="mono">
                            {attempt.id}
                          </Text>
                          <Text color="fg.muted" fontSize="sm">
                            Started: {attempt.startTime.toLocaleString()}
                          </Text>
                        </Stack>
                        <HStack gap={2}>
                          <Button
                            colorPalette="teal"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate({
                                to: "/attempts/$id",
                                params: { id: attempt.id },
                              })
                            }
                          >
                            View Attempt
                          </Button>
                          <Button
                            colorPalette="red"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(attempt.id)}
                          >
                            Delete + Moderation
                          </Button>
                        </HStack>
                      </Flex>
                    ))}
                  </Stack>
                )}
              </Box>
              <Box bg="bg.subtle" borderRadius="xl" p={6} boxShadow="md">
                <Heading size="md" mb={4}>
                  Moderations ({visibleModerations.length})
                </Heading>
                {visibleModerations.length === 0 ? (
                  <Text color="fg.muted">No moderations found.</Text>
                ) : (
                  <Stack gap={3}>
                    {visibleModerations.map((moderation) => (
                      <Flex
                        key={moderation.id}
                        justify="space-between"
                        align="center"
                        borderWidth="1px"
                        borderRadius="lg"
                        p={4}
                        gap={4}
                        wrap="wrap"
                      >
                        <Stack gap={1}>
                          <HStack gap={2}>
                            <Badge
                              colorPalette={
                                moderationStatusPalette[moderation.status]
                              }
                            >
                              {moderation.status}
                            </Badge>
                            <Text
                              color="fg.muted"
                              fontSize="sm"
                              fontFamily="mono"
                            >
                              {moderation.id}
                            </Text>
                          </HStack>
                          <Text color="fg.muted" fontSize="sm">
                            Submitted:{" "}
                            {new Date(
                              moderation.submissionDate,
                            ).toLocaleString()}
                            {moderation.moderationDate &&
                              ` | Moderated: ${new Date(
                                moderation.moderationDate,
                              ).toLocaleString()}`}
                          </Text>
                          {moderation.feedback && (
                            <Text fontSize="sm">
                              Feedback: {moderation.feedback}
                            </Text>
                          )}
                        </Stack>
                        <Button
                          colorPalette="teal"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: "/attempts/$id",
                              params: { id: moderation.examAttemptId },
                            })
                          }
                        >
                          View Attempt
                        </Button>
                      </Flex>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          ) : (
            <Center py={12}>
              <Text color="fg.muted" fontSize="lg">
                Search for a user to see their attempts and moderations.
              </Text>
            </Center>
          )}
        </Stack>
      </Center>
      <DeleteAttemptModal
        open={deleteTarget !== null}
        attemptId={deleteTarget ?? ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            scheduleDelete(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />
    </Box>
  );
}

export const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  validateSearch: (search: Record<string, unknown>): UsersSearch => ({
    field: SEARCH_FIELDS.find((f) => f.key === search.field)?.key,
    value: typeof search.value === "string" ? search.value : undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <Users />
    </ProtectedRoute>
  ),
});
