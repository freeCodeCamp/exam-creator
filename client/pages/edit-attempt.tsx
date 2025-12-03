import { useContext, useEffect, useRef } from "react";
import { InfiniteData, useMutation, useQuery } from "@tanstack/react-query";
import {
  createRoute,
  useParams,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
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
  SimpleGrid,
  Stack,
  Heading,
  Flex,
} from "@chakra-ui/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip as ReChartsTooltip,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { ExamEnvironmentExamModerationStatus } from "@prisma/client";

import { rootRoute } from "./root";
import { ProtectedRoute } from "../components/protected-route";
import {
  UsersWebSocketActivityContext,
  UsersWebSocketUsersContext,
} from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import {
  getAttemptById,
  getModerations,
  patchModerationStatusByAttemptId,
} from "../utils/fetch";
import { attemptsRoute } from "./attempts";
import { Attempt } from "../types";
import { secondsToHumanReadable } from "../utils/question";
import { queryClient } from "../contexts";

function Edit() {
  const { id } = useParams({ from: "/attempts/$id" });
  const { user, logout } = useContext(AuthContext)!;

  const navigate = useNavigate();

  const attemptQuery = useQuery({
    queryKey: ["attempt", id],
    enabled: !!user,
    queryFn: () => getAttemptById(id!),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const bg = useColorModeValue("black", "black");
  const spinnerColor = useColorModeValue("teal.400", "teal.300");

  return (
    <Box minH="100vh" bg={bg} py={14} px={2} position="relative">
      <HStack position="fixed" top={3} left={8} zIndex={101} spacing={3}>
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
  const { users, error: usersError } = useContext(UsersWebSocketUsersContext)!;
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;

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
      right="18rem"
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
                src={user.picture ?? undefined}
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

function EditAttempt({ attempt }: { attempt: Attempt }) {
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const buttonBoxRef = useRef<HTMLDivElement | null>(null);
  const approveButtonRef = useRef<HTMLButtonElement | null>(null);
  const denyButtonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const { filter } = useSearch({ from: editAttemptRoute.to });

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, [attempt]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // 'm' key focuses the button box (and approve button)
      if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        buttonBoxRef.current?.focus();
        approveButtonRef.current?.focus();
      }
    };

    const handleButtonBoxKeyPress = (event: KeyboardEvent) => {
      // Only handle 'a' and 'd' when the button box has focus
      if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        approveButtonRef.current?.click();
      } else if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        denyButtonRef.current?.click();
      }
    };

    // Global listener for 'm' key
    window.addEventListener("keydown", handleKeyPress);

    // Listener on button box for 'a' and 'd' keys
    const buttonBox = buttonBoxRef.current;
    if (buttonBox) {
      buttonBox.addEventListener("keydown", handleButtonBoxKeyPress);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (buttonBox) {
        buttonBox.removeEventListener("keydown", handleButtonBoxKeyPress);
      }
    };
  }, []);

  const patchModerationStatusByAttemptIdMutation = useMutation({
    mutationKey: ["patch-moderation-status"],
    mutationFn: (status: ExamEnvironmentExamModerationStatus) => {
      return patchModerationStatusByAttemptId({
        status,
        attemptId: attempt.id,
      });
    },
    retry: false,
    onSuccess: () => {
      // Navigate to next attempt
      const moderationsData = queryClient.getQueryData<
        InfiniteData<Awaited<ReturnType<typeof getModerations>>, unknown>
      >(["filteredModerations", filter]);
      if (moderationsData) {
        // Find the index of the current attempt
        const flatModerations = moderationsData.pages.flat();
        const currentIndex = flatModerations.findIndex(
          (m) => m.examAttemptId === attempt.id
        );
        const nextAttemptId =
          flatModerations.at(currentIndex + 1)?.examAttemptId ?? null;
        if (nextAttemptId) {
          navigate({
            to: editAttemptRoute.to,
            params: { id: nextAttemptId },
            search: { filter },
          });
          return;
        }
      }

      navigate({ to: attemptsRoute.to, search: { filter } });
    },
    onError: (error: any) => {
      alert(`Error submitting moderation: ${error.message}`);
    },
  });

  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  const startTimeInMS = attempt.startTime.getTime();

  const totalQuestions = attempt.config.questionSets
    .map((qs) => qs.numberOfQuestions * qs.numberOfSet)
    .reduce((a, b) => a + b, 0);
  // TODO: Consider bar chart with sorted values
  //       Show questions in order final answer was recorded
  const flattened = attempt.questionSets.flatMap((qs) => qs.questions);
  const timeToAnswers = flattened.map((q, i) => {
    const submissionTimeInMS = q.submissionTime?.getTime() ?? 0;
    const secondsSinceStart = (submissionTimeInMS - startTimeInMS) / 1000;
    // Determine if the answer is correct
    const isCorrect = q.answers
      .filter((a) => a.isCorrect)
      .every((a) => q.selected && q.selected.includes(a.id));
    return {
      name: i + 1,
      value: secondsSinceStart,
      isCorrect,
    };
  });

  const answered = flattened.filter((f) => {
    return !!f.submissionTime;
  }).length;
  const correct = flattened.filter((f) => {
    return f.answers
      .filter((a) => a.isCorrect)
      .every((a) => f.selected.includes(a.id));
  }).length;
  const lastSubmission = Math.max(
    ...flattened.map((f) => {
      return f.submissionTime?.getTime() ?? 0;
    })
  );
  const timeToComplete = (lastSubmission - startTimeInMS) / 1000;

  const averageTimePerQuestion =
    answered > 0 ? (timeToComplete / answered).toFixed(2) : "0";

  return (
    <>
      <Box
        ref={buttonBoxRef}
        position="fixed"
        top={3}
        right="1rem"
        zIndex={100}
        bg={cardBg}
        borderRadius="xl"
        boxShadow="lg"
        px={2}
        py={2}
        display="flex"
        alignItems="center"
        gap={4}
        tabIndex={0}
      >
        <Button
          ref={approveButtonRef}
          colorScheme="green"
          px={4}
          fontWeight="bold"
          fontSize={"2xl"}
          isLoading={patchModerationStatusByAttemptIdMutation.isPending}
          isDisabled={patchModerationStatusByAttemptIdMutation.isPending}
          onClick={() => {
            patchModerationStatusByAttemptIdMutation.mutate("Approved");
          }}
        >
          Approve
        </Button>
        <Button
          ref={denyButtonRef}
          colorScheme="red"
          px={4}
          fontWeight="bold"
          fontSize={"2xl"}
          isLoading={patchModerationStatusByAttemptIdMutation.isPending}
          isDisabled={patchModerationStatusByAttemptIdMutation.isPending}
          onClick={() => {
            patchModerationStatusByAttemptIdMutation.mutate("Denied");
          }}
        >
          Deny
        </Button>
      </Box>
      <Stack spacing={8} w="full" maxW="7xl">
        <Box bg={cardBg} borderRadius="xl" boxShadow="lg" p={8} mb={4} w="full">
          <Heading color={accent} fontWeight="extrabold" fontSize="2xl" mb={2}>
            Moderate Attempt
          </Heading>
          <Flex direction={"column"} mb={4}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={timeToAnswers}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid stroke="#aaa" strokeDasharray="5 5" />
                <Bar
                  type="monotone"
                  dataKey="value"
                  name="time to answer"
                  // Custom fill for each bar
                  fill={"purple"}
                >
                  {timeToAnswers.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isCorrect ? "green" : "purple"}
                    />
                  ))}
                </Bar>
                <XAxis
                  dataKey="name"
                  label={{
                    value: "question number",
                    position: "insideBottom",
                    offset: 0,
                  }}
                />
                <YAxis
                  width="auto"
                  label={{
                    value: "seconds since exam start",
                    position: "insideBottomLeft",
                    angle: -90,
                    offset: 20,
                  }}
                />
                <ReChartsTooltip cursor={false} />
              </BarChart>
            </ResponsiveContainer>
            <SimpleGrid
              // minChildWidth={"200px"}
              columns={{ base: 1, md: 2, lg: 3 }}
              spacing={4}
            >
              <Box
                bg="gray.700"
                p={2}
                borderRadius="md"
                borderLeft="4px solid"
                borderColor={accent}
              >
                <Text fontSize="sm" color="gray.400" mb={1}>
                  Total Questions
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="white">
                  {totalQuestions}
                </Text>
              </Box>
              <Box
                bg="gray.700"
                p={2}
                borderRadius="md"
                borderLeft="4px solid"
                borderColor={accent}
              >
                <Text fontSize="sm" color="gray.400" mb={1}>
                  Answered
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="white">
                  {answered}
                  <Text as="span" fontSize="sm" color="gray.400" ml={2}>
                    ({((answered / totalQuestions) * 100).toFixed(1)}%)
                  </Text>
                </Text>
              </Box>
              <Box
                bg="gray.700"
                p={2}
                borderRadius="md"
                borderLeft="4px solid"
                borderColor="green.400"
              >
                <Text fontSize="sm" color="gray.400" mb={1}>
                  Correct Answers
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="white">
                  {correct}
                  <Text as="span" fontSize="sm" color="gray.400" ml={2}>
                    (
                    {totalQuestions > 0
                      ? ((correct / totalQuestions) * 100).toFixed(1)
                      : 0}
                    %)
                  </Text>
                </Text>
              </Box>
              <Box
                bg="gray.700"
                p={2}
                borderRadius="md"
                borderLeft="4px solid"
                borderColor="purple.400"
              >
                <Text fontSize="sm" color="gray.400" mb={1}>
                  Accuracy
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="white">
                  {answered > 0 ? ((correct / answered) * 100).toFixed(1) : 0}%
                </Text>
              </Box>
              <Box
                bg="gray.700"
                p={2}
                borderRadius="md"
                borderLeft="4px solid"
                borderColor="blue.400"
              >
                <Text fontSize="sm" color="gray.400" mb={1}>
                  Total Time
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="white">
                  {secondsToHumanReadable(timeToComplete)}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {timeToComplete.toFixed(0)}s
                </Text>
              </Box>
              <Box
                bg="gray.700"
                p={2}
                borderRadius="md"
                borderLeft="4px solid"
                borderColor="blue.400"
              >
                <Text fontSize="sm" color="gray.400" mb={1}>
                  Avg Time / Question
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="white">
                  {averageTimePerQuestion}s
                </Text>
              </Box>
            </SimpleGrid>
          </Flex>
        </Box>
      </Stack>
    </>
  );
}

export const editAttemptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/attempts/$id",
  component: () => (
    <ProtectedRoute>
      <Edit />
    </ProtectedRoute>
  ),
});
