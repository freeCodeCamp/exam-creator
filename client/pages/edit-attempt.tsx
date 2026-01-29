import { useContext, useEffect, useRef, useState, useMemo } from "react";
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
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverBody,
  Portal,
} from "@chakra-ui/react";
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
  getEventsByAttemptId,
  getModerationByAttemptId,
  getModerations,
  getNumberOfAttemptsByUserId,
  patchModerationStatusByAttemptId,
} from "../utils/fetch";
import { attemptsRoute } from "./attempts";
import { Attempt, Event } from "../types";
import { prettyDate, secondsToHumanReadable } from "../utils/question";
import { moderationKeys } from "../hooks/queries";
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  ReferenceArea,
  Line,
  XAxis,
  YAxis,
  Legend,
  Scatter,
  DefaultLegendContent,
  DefaultLegendContentProps,
  TooltipContentProps,
} from "recharts";
import { BracketLayer } from "../components/diff-brackets";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

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

  const eventsQuery = useQuery({
    queryKey: ["events", id],
    enabled: !!user,
    queryFn: () => getEventsByAttemptId(id!),
    staleTime: 3_600_000,
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
        {attemptQuery.isPending || eventsQuery.isPending ? (
          <Spinner color={spinnerColor} size="xl" />
        ) : attemptQuery.isError || eventsQuery.isError ? (
          <Text color="red.400" fontSize="lg">
            Error loading exam:{" "}
            {attemptQuery.error?.message ?? eventsQuery.error?.message}
          </Text>
        ) : (
          <EditAttempt attempt={attemptQuery.data} events={eventsQuery.data} />
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

function EditAttempt({
  attempt,
  events,
}: {
  attempt: Attempt;
  events: Event[];
}) {
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const [isSubmissionDiffToggled, setIsSubmissionDiffToggled] = useState(false);
  const [isSubmissionTimeToggled, setIsSubmissionTimeToggled] = useState(false);
  const [isSubmissionTimelineToggled, setIsSubmissionTimelineToggled] =
    useState(false);
  const [isEventsToggled, setIsEventsToggled] = useState(true);
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
  }, [buttonBoxRef.current, approveButtonRef.current, denyButtonRef.current]);

  const patchModerationStatusByAttemptIdMutation = useMutation({
    mutationKey: ["patch-moderation-status"],
    mutationFn: (status: ExamEnvironmentExamModerationStatus) => {
      return patchModerationStatusByAttemptId({
        status,
        attemptId: attempt.id,
      });
    },
    retry: false,
    onSuccess: (_a, _b, _c, ctx) => {
      // Navigate to next attempt
      const queriesData = ctx.client.getQueriesData<
        InfiniteData<Awaited<ReturnType<typeof getModerations>>, unknown>
      >({ queryKey: moderationKeys.all });
      const moderationsData = queriesData?.[0]?.[1];
      if (moderationsData) {
        // Find the index of the current attempt
        const flatModerations = moderationsData.pages.flat();
        const currentIndex = flatModerations.findIndex(
          (m) => m.examAttemptId === attempt.id,
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
      attempt.id,
      events,
    ],
    queryFn: () => {
      let {
        questions,
        totalQuestions,
        answered,
        correct,
        timeToComplete,
        averageTimePerQuestion,
      } = getAttemptStats(attempt, {
        isSubmissionTimeToggled,
        isSubmissionTimelineToggled,
      });

      return {
        questions,
        totalQuestions,
        answered,
        correct,
        timeToComplete,
        averageTimePerQuestion,
      };
    },
  });

  const chartData = useMemo(() => {
    if (!attemptStatsQuery.data) return null;
    const { questions } = attemptStatsQuery.data;
    const attemptStartTime = attempt.startTime.getTime();

    const correctAnswers = questions.filter((q) => q.isCorrect);

    const incorrectAnswers = questions.filter(
      (q) => !q.isCorrect && !!q.submissionTime,
    );

    const questionIdToIndexMap = new Map<string, number>();
    questions.forEach((q) => {
      questionIdToIndexMap.set(q.id, q.idx);
    });

    const visitEvents = events
      .filter((e) => e.kind === "QUESTION_VISIT")
      .map((e) => {
        // @ts-expect-error Types are hard
        const idx = questionIdToIndexMap.get(e.meta?.question ?? "");
        if (idx === undefined) return null;

        return {
          idx,
          timeSinceStartInS: (e.timestamp.getTime() - attemptStartTime) / 1000,
          kind: "QUESTION_VISIT",
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    // BLUR -> FOCUS
    const focusGaps = [];
    // sort events by time to ensure correct pairing
    const sortedEvents = [...events].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    let lastBlurEvent: Event | null = null;

    for (const e of sortedEvents) {
      if (e.kind === "BLUR") {
        lastBlurEvent = e;
      } else if (e.kind === "FOCUS" && lastBlurEvent) {
        const blurTime =
          (lastBlurEvent.timestamp.getTime() - attemptStartTime) / 1000;
        const focusTime = (e.timestamp.getTime() - attemptStartTime) / 1000;

        // Map to the question active during the blur, if possible
        const questionId = lastBlurEvent.meta?.question || e.meta?.question;
        const idx = questionId
          ? // @ts-expect-error Types \_O_/
            questionIdToIndexMap.get(questionId)
          : undefined;

        if (idx !== undefined) {
          focusGaps.push({
            idx,
            blurTime,
            focusTime,
            timeSinceStartInS: blurTime,
          });
        }

        lastBlurEvent = null;
      }
    }

    const finalSubmissionTime = Math.max(
      ...questions.map((q) => q.submissionTime?.getTime() ?? 0),
      ...events.map((e) => e.timestamp.getTime()),
    );

    return {
      correctAnswers,
      incorrectAnswers,
      visitEvents,
      focusGaps,
      finalSubmissionTime,
    };
  }, [attemptStatsQuery.data, events, attempt]);

  if (
    attemptStatsQuery.isFetching ||
    attemptStatsQuery.isError ||
    !attemptStatsQuery.isSuccess ||
    !chartData
  ) {
    return <Spinner />;
  }

  const {
    questions,
    totalQuestions,
    answered,
    correct,
    timeToComplete,
    averageTimePerQuestion,
  } = attemptStatsQuery.data;

  const { correctAnswers, incorrectAnswers, visitEvents, focusGaps } =
    chartData;

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
              <FormControl alignItems={"center"} display={"flex"}>
                <FormLabel htmlFor="event-switch" color="gray.400">
                  Enable Events
                </FormLabel>
                <Switch
                  id="event-switch"
                  isChecked={isEventsToggled}
                  onChange={(e) => setIsEventsToggled(e.target.checked)}
                />
              </FormControl>
            </SimpleGrid>
            <Box resize={"vertical"} overflow={"auto"} minHeight={300}>
              <ResponsiveContainer width="100%" minHeight={300}>
                <ComposedChart
                  margin={{ top: 15, right: 20, bottom: 5, left: 0 }}
                >
                  <CartesianGrid opacity={0.2} />
                  {isEventsToggled &&
                    focusGaps.map((f) => {
                      const stroke = "red";
                      const opacity = 0.3;
                      const y1 = f.blurTime;
                      const y2 = f.focusTime;
                      const time = (y2 - y1).toFixed(2);
                      return (
                        <Popover key={f.idx} placement="top" isLazy>
                          <PopoverTrigger>
                            <ReferenceArea
                              {...{ y1, y2, stroke, opacity }}
                              yAxisId={"left"}
                            />
                          </PopoverTrigger>
                          <Portal>
                            <PopoverContent width={time.length * 20 + "px"}>
                              <PopoverArrow />
                              <PopoverCloseButton />
                              <PopoverBody>{time}s</PopoverBody>
                            </PopoverContent>
                          </Portal>
                        </Popover>
                      );
                    })}

                  {isSubmissionTimelineToggled && (
                    <Line
                      data={questions.filter((q) => !!q.questionTimeDiff)}
                      yAxisId="right"
                      type="monotone"
                      dataKey={"questionTimeDiff"}
                      stroke="#ff7300"
                      strokeWidth={2}
                      dot={false}
                    />
                  )}

                  <XAxis
                    dataKey="idx"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickCount={totalQuestions}
                    allowDecimals={false}
                    label={{
                      value: "question number",
                      position: "insideBottom",
                      offset: 0,
                    }}
                  />
                  <YAxis
                    width={60}
                    dataKey={"timeSinceStartInS"}
                    tickCount={30}
                    yAxisId={"left"}
                    type="number"
                    label={{
                      value: "seconds since start",
                      position: "insideBottomLeft",
                      angle: -90,
                      offset: 10,
                    }}
                  />
                  <YAxis
                    width={40}
                    yAxisId={"right"}
                    orientation="right"
                    label={{
                      value: "diff [s]",
                      position: "insideTopRight",
                      angle: -90,
                      offset: 10,
                    }}
                  />

                  <Legend
                    verticalAlign="top"
                    height={36}
                    content={legendFill}
                  />

                  <Scatter
                    name="Correct"
                    data={correctAnswers}
                    dataKey="timeSinceStartInS"
                    fill="green"
                    yAxisId="left"
                  />

                  <Scatter
                    name="Incorrect"
                    data={incorrectAnswers}
                    dataKey="timeSinceStartInS"
                    fill="red"
                    yAxisId="left"
                  />

                  {isEventsToggled && (
                    <Scatter
                      name="Visit"
                      data={visitEvents}
                      dataKey="timeSinceStartInS"
                      fill="transparent"
                      stroke="purple"
                      shape="circle"
                      yAxisId="left"
                    />
                  )}

                  {isSubmissionDiffToggled &&
                    questions.map((entry, index) => {
                      if (index === 0) return null;
                      const prev = questions[index - 1];
                      if (!entry.timeSinceStartInS || !prev.timeSinceStartInS)
                        return null;

                      const peakValue = Math.max(
                        prev.timeSinceStartInS,
                        entry.timeSinceStartInS,
                      );

                      return (
                        <ReferenceArea
                          key={`bracket-${index}`}
                          x1={prev.idx}
                          x2={entry.idx}
                          y1={peakValue}
                          y2={peakValue}
                          strokeOpacity={0}
                          yAxisId={"left"}
                          fillOpacity={0}
                          label={
                            <BracketLayer
                              prevValue={prev.timeSinceStartInS}
                              currValue={entry.timeSinceStartInS}
                            />
                          }
                        />
                      );
                    })}
                  <RechartsTooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={TooltipContent}
                    shared={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
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
                    {((answered / totalQuestions) * 100).toFixed(1)}%
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
              <Box
                bg="gray.700"
                p={2}
                borderRadius="md"
                borderLeft="4px solid"
                borderColor="blue.400"
              >
                <Text fontSize="sm" color="gray.400" mb={1}>
                  Events
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="white">
                  {events.length}
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
                  Total Unfocussed Time
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="white">
                  {focusGaps
                    .reduce(
                      (acc, curr) => acc + (curr.focusTime - curr.blurTime),
                      0,
                    )
                    .toFixed(2)}
                  s
                </Text>
              </Box>
            </SimpleGrid>
            {moderationQuery.data?.feedback && (
              <Text color="white" py={3}>
                <b>Feedback</b>: {moderationQuery.data?.feedback}
              </Text>
            )}
            <AllUserAttemptsContainer
              attempt={attempt}
              options={{ isSubmissionTimeToggled, isSubmissionTimelineToggled }}
            />
          </Flex>
        </Box>
      </Stack>
    </>
  );
}

function TooltipContent({
  active,
  payload,
}: TooltipContentProps<ValueType, NameType>) {
  const showTooltip = active && payload && payload.length;
  if (!showTooltip) {
    return null;
  }
  const data = payload[0].payload;
  const label =
    typeof data.isCorrect === "boolean"
      ? data.isCorrect
        ? "Correct"
        : "Incorrect"
      : data.kind;
  return (
    <Flex
      flexDirection={"column"}
      color="white"
      background={"rgba(113, 148, 172, 0.27)"}
      border="1px solid rgba(0,40,255,0.3)"
      padding={2}
    >
      <Text>Label: {label}</Text>
      <Text>Question: {data.idx}</Text>
      <Text>Time [s]: {data.timeSinceStartInS}</Text>
    </Flex>
  );
}

function legendFill({ payload, ref, ...rest }: DefaultLegendContentProps) {
  const payloadWithFill = payload?.map((p) => {
    const color =
      // @ts-ignore
      p.color === "transparent" ? (p.payload?.stroke ?? "white") : p.color;
    return {
      ...p,
      color,
    };
  });
  return <DefaultLegendContent payload={payloadWithFill} {...rest} />;
}

function AllUserAttemptsContainer({
  attempt,
  options,
}: {
  attempt: Attempt;
  options: AttemptOptions;
}) {
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
        <AllUserAttempts attempts={attemptsMutation.data} options={options} />
      )}
    </Center>
  );
}

function AllUserAttempts({
  attempts,
  options,
}: {
  attempts: Attempt[];
  options: AttemptOptions;
}) {
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
              } = getAttemptStats(attempt, options);
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

type QuestionData = {
  isCorrect: boolean;
  timeSinceStartInS: number | null;
  idx: number;
  questionTimeDiff?: number;
} & Attempt["questionSets"][number]["questions"][number];
type AttemptOptions = {
  isSubmissionTimeToggled: boolean;
  isSubmissionTimelineToggled: boolean;
};

function getAttemptStats(attempt: Attempt, options: AttemptOptions) {
  const startTimeInMS = attempt.startTime.getTime();

  const flattened = attempt.questionSets.flatMap((qs) => qs.questions);
  const totalQuestions = flattened.filter((q) => !!q.generated.length).length;

  let correct = 0;
  let questions: QuestionData[] = [];
  for (const question of flattened) {
    const submissionTime = question.submissionTime;
    // if generation has 0 anwers, then question is not in generation, and should be skipped
    const inGeneration = !!question.generated.length;
    if (!inGeneration) {
      continue;
    }
    const allCorrectAnswerIds = question.answers
      .filter((a) => a.isCorrect)
      .map((a) => a.id);
    const allShownCorrectAnswers = question.generated.filter((ga) =>
      allCorrectAnswerIds.includes(ga),
    );
    // Every shown correct answer is selected
    const isCorrect = allShownCorrectAnswers.every((a) =>
      question.selected.includes(a),
    );
    if (isCorrect) {
      correct++;
    }

    const timeSinceStartInS = submissionTime
      ? (submissionTime.getTime() - startTimeInMS) / 1000
      : null;

    const q = {
      ...question,
      idx: questions.length,
      timeSinceStartInS,
      isCorrect,
    };
    questions.push(q);
  }

  if (options.isSubmissionTimeToggled) {
    questions.sort((a, b) => {
      return (a.timeSinceStartInS ?? 0) - (b.timeSinceStartInS ?? 0);
    });
  }

  if (options.isSubmissionTimelineToggled) {
    questions = questions.map((t, i) => {
      if (!t.timeSinceStartInS) return t;
      if (i === 0) return { ...t, questionTimeDiff: t.timeSinceStartInS };

      const prev = questions[i - 1];

      if (!prev.timeSinceStartInS) return t;

      return {
        ...t,
        questionTimeDiff: t.timeSinceStartInS - prev.timeSinceStartInS,
      };
    });
  }

  const lastSubmission = Math.max(
    ...flattened.map((f) => {
      return f.submissionTime?.getTime() ?? 0;
    }),
  );
  const timeToComplete = (lastSubmission - startTimeInMS) / 1000;

  const answered = questions.length;
  const averageTimePerQuestion =
    answered > 0 ? (timeToComplete / answered).toFixed(2) : "0";

  return {
    questions,
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
