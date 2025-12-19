import { useContext, useEffect, useRef, useState } from "react";
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
  FormControl,
  FormLabel,
  Switch,
} from "@chakra-ui/react";
import {
  Bar,
  Tooltip as ReChartsTooltip,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  ReferenceArea,
  Line,
  ComposedChart,
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
  getAttemptsByUserId,
  getModerationByAttemptId,
  getModerations,
  getNumberOfAttemptsByUserId,
  patchModerationStatusByAttemptId,
} from "../utils/fetch";
import { attemptsRoute } from "./attempts";
import { Attempt } from "../types";
import { prettyDate, secondsToHumanReadable } from "../utils/question";
import { queryClient } from "../contexts";
import { BracketLayer } from "../components/diff-brackets";

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
  // TODO: Consider sticking in user settings
  const [isSubmissionDiffToggled, setIsSubmissionDiffToggled] = useState(false);
  const [isSubmissionTimeToggled, setIsSubmissionTimeToggled] = useState(false);
  const [isSubmissionTimelineToggled, setIsSubmissionTimelineToggled] =
    useState(false);
  const buttonBoxRef = useRef<HTMLDivElement | null>(null);
  const approveButtonRef = useRef<HTMLButtonElement | null>(null);
  const denyButtonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const { filter } = useSearch({ from: editAttemptRoute.to });

  const moderationQuery = useQuery({
    queryKey: ["moderation", attempt.id],
    queryFn: () => getModerationByAttemptId(attempt.id),
    retry: false,
    refetchOnWindowFocus: false,
  });

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

  const attemptStatsQuery = useQuery({
    queryKey: [
      "attempt-stats-calc",
      isSubmissionTimeToggled,
      isSubmissionTimelineToggled,
    ],
    queryFn: () => {
      let {
        timeToAnswers,
        totalQuestions,
        answered,
        correct,
        timeToComplete,
        averageTimePerQuestion,
      } = getAttemptStats(attempt);

      if (isSubmissionTimeToggled) {
        timeToAnswers.sort((a, b) => {
          return a.value - b.value;
        });
      }

      if (isSubmissionTimelineToggled) {
        timeToAnswers = timeToAnswers.map((t, i) => {
          if (i === 0) return { ...t, questionTimeDiff: t.value };

          const prev = timeToAnswers[i - 1];

          return { ...t, questionTimeDiff: t.value - prev.value };
        });
      }

      return {
        timeToAnswers,
        totalQuestions,
        answered,
        correct,
        timeToComplete,
        averageTimePerQuestion,
      };
    },
  });

  if (
    attemptStatsQuery.isFetching ||
    attemptStatsQuery.isError ||
    !attemptStatsQuery.isSuccess
  ) {
    return <Spinner />;
  }

  const {
    timeToAnswers,
    totalQuestions,
    answered,
    correct,
    timeToComplete,
    averageTimePerQuestion,
  } = attemptStatsQuery.data;

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
          <Flex
            direction={"row"}
            justifyContent={"space-between"}
            alignItems={"center"}
          >
            <Heading
              color={accent}
              fontWeight="extrabold"
              fontSize="2xl"
              mb={2}
            >
              {attempt.config.name}
            </Heading>
            <Text color={accent}>{prettyDate(attempt.startTime)}</Text>
          </Flex>
          <Flex direction={"column"} mb={4}>
            <SimpleGrid minChildWidth={"230px"} spacing={4}>
              <FormControl alignItems={"center"} display={"flex"}>
                <FormLabel htmlFor="submission-diff" color="gray.400">
                  Enable Submission Diff
                </FormLabel>
                <Switch
                  id="submission-diff"
                  isChecked={isSubmissionDiffToggled}
                  onChange={(e) => setIsSubmissionDiffToggled(e.target.checked)}
                />
              </FormControl>
              <FormControl alignItems={"center"} display={"flex"}>
                <FormLabel htmlFor="submission-time-sort" color="gray.400">
                  Sort by Submission Time
                </FormLabel>
                <Switch
                  id="submission-time-sort"
                  isChecked={isSubmissionTimeToggled}
                  onChange={(e) => setIsSubmissionTimeToggled(e.target.checked)}
                />
              </FormControl>
              <FormControl alignItems={"center"} display={"flex"}>
                <FormLabel htmlFor="submission-timeline" color="gray.400">
                  Enable Submission Frequency
                </FormLabel>
                <Switch
                  id="submission-timeline"
                  isChecked={isSubmissionTimelineToggled}
                  onChange={(e) =>
                    setIsSubmissionTimelineToggled(e.target.checked)
                  }
                />
              </FormControl>
            </SimpleGrid>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={timeToAnswers}
                margin={{ top: 15, right: 20, bottom: 5, left: 0 }}
              >
                <Bar
                  type="monotone"
                  dataKey="value"
                  name="submission time"
                  // Custom fill for each bar
                  fill={"purple"}
                  yAxisId={"left"}
                >
                  {timeToAnswers.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isCorrect ? "green" : "red"}
                    />
                  ))}
                </Bar>
                {isSubmissionTimelineToggled && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={"questionTimeDiff"}
                    stroke="#ff7300"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
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
                  yAxisId={"left"}
                  label={{
                    value: "seconds since exam start",
                    position: "insideBottomLeft",
                    angle: -90,
                    offset: 20,
                  }}
                />
                <YAxis
                  width="auto"
                  yAxisId={"right"}
                  orientation="right"
                  label={{
                    value: "time between questions [s]",
                    position: "insideTopRight",
                    angle: -90,
                    offset: 20,
                  }}
                />
                {isSubmissionDiffToggled &&
                  timeToAnswers.map((entry, index) => {
                    if (index === 0) return null;
                    const prev = timeToAnswers[index - 1];

                    // Calculate the highest point of the two bars to anchor the bracket
                    const peakValue = Math.max(prev.value, entry.value);

                    return (
                      <ReferenceArea
                        key={`bracket-${index}`}
                        x1={prev.name} // Matches XAxis dataKey
                        x2={entry.name}
                        y1={peakValue}
                        y2={peakValue}
                        strokeOpacity={0}
                        yAxisId={"left"}
                        fillOpacity={0} // Makes the area itself invisible
                        label={
                          <BracketLayer
                            prevValue={prev.value}
                            currValue={entry.value}
                          />
                        }
                      />
                    );
                  })}
                <ReChartsTooltip
                  cursor={false}
                  formatter={(value, name) => {
                    return [secondsToHumanReadable(Number(value)), name];
                  }}
                />
              </ComposedChart>
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
            {moderationQuery.data?.feedback && (
              <Text color="white" py={3}>
                <b>Feedback</b>: {moderationQuery.data?.feedback}
              </Text>
            )}
            <AllUserAttemptsContainer attempt={attempt} />
          </Flex>
        </Box>
      </Stack>
    </>
  );
}

function AllUserAttemptsContainer({ attempt }: { attempt: Attempt }) {
  const attemptsMutation = useMutation({
    mutationKey: ["user-attempts", attempt.userId],
    mutationFn: (userId: string) => getAttemptsByUserId(userId),
    retry: false,
  });
  const numberOfAttemptsQuery = useQuery({
    queryKey: ["user-number-of-attempts", attempt.userId],
    queryFn: () => getNumberOfAttemptsByUserId(attempt.userId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <Center mt={2}>
      {!attemptsMutation.data ? (
        <Button
          colorScheme="teal"
          size="lg"
          onClick={() => attemptsMutation.mutate(attempt.userId)}
          disabled={attemptsMutation.isPending}
          isLoading={attemptsMutation.isPending}
        >
          Fetch All User Attempts (
          {numberOfAttemptsQuery.isFetching ? (
            <Spinner />
          ) : numberOfAttemptsQuery.isError ? (
            "?"
          ) : (
            numberOfAttemptsQuery.data
          )}
          )
        </Button>
      ) : (
        <AllUserAttempts attempts={attemptsMutation.data} />
      )}
    </Center>
  );
}

/**
 * Shows all attempts for the same exam in a table with:
 * - Date taken (start time)
 * - Correct answers
 * - Average time
 * - Total time
 * - Percentage correct
 *
 */
function AllUserAttempts({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) {
    return null;
  }

  return (
    <Box mt={8} w="full">
      <Heading size={"md"} mb={4} color="teal.400">
        All User Attempts for This Exam
      </Heading>
      <Box overflowX="auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px" }}>Date Taken</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Exam</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Answers</th>
              <th style={{ textAlign: "left", padding: "8px" }}>
                Average Time
              </th>
              <th style={{ textAlign: "left", padding: "8px" }}>Total Time</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => {
              const {
                correct,
                totalQuestions,
                averageTimePerQuestion,
                timeToComplete,
                answered,
              } = getAttemptStats(attempt);
              return (
                <tr key={attempt.id} style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "8px" }}>
                    {prettyDate(attempt.startTime)}
                  </td>
                  <td style={{ padding: "8px" }}>{attempt.config.name}</td>
                  <td style={{ padding: "8px" }}>
                    {correct}/{answered}
                  </td>
                  <td style={{ padding: "8px" }}>{averageTimePerQuestion}s</td>
                  <td style={{ padding: "8px" }}>
                    {timeToComplete.toFixed(0)}s
                  </td>
                  <td style={{ padding: "8px" }}>
                    {totalQuestions > 0
                      ? ((correct / totalQuestions) * 100).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}

function getAttemptStats(attempt: Attempt) {
  const startTimeInMS = attempt.startTime.getTime();

  const flattened = attempt.questionSets.flatMap((qs) => qs.questions);
  const totalQuestions = flattened.filter((q) => !!q.generated.length).length;

  let correct = 0;
  const timeToAnswers: { name: number; value: number; isCorrect: boolean }[] =
    [];
  for (const question of flattened) {
    const isAnswered = !!question.submissionTime;
    if (!isAnswered) {
      continue;
    }
    const allCorrectAnswerIds = question.answers
      .filter((a) => a.isCorrect)
      .map((a) => a.id);
    const allShownCorrectAnswers = question.generated.filter((ga) =>
      allCorrectAnswerIds.includes(ga)
    );
    // Every shown correct answer is selected
    const isCorrect = allShownCorrectAnswers.every((a) =>
      question.selected.includes(a)
    );
    if (isCorrect) {
      correct++;
    }

    const timeToAnswer = {
      name: timeToAnswers.length,
      value: ((question.submissionTime?.getTime() ?? 0) - startTimeInMS) / 1000,
      isCorrect,
    };
    timeToAnswers.push(timeToAnswer);
  }

  const lastSubmission = Math.max(
    ...flattened.map((f) => {
      return f.submissionTime?.getTime() ?? 0;
    })
  );
  const timeToComplete = (lastSubmission - startTimeInMS) / 1000;

  const answered = timeToAnswers.length;
  const averageTimePerQuestion =
    answered > 0 ? (timeToComplete / answered).toFixed(2) : "0";

  return {
    timeToAnswers,
    totalQuestions,
    answered,
    correct,
    timeToComplete,
    averageTimePerQuestion,
  };
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
