import {
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { InfiniteData, useMutation, useQuery } from "@tanstack/react-query";
import {
  createRoute,
  useParams,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  Box,
  Badge,
  Button,
  Center,
  Text,
  HStack,
  Spinner,
  SimpleGrid,
  Stack,
  Heading,
  Flex,
  Field,
  Switch,
} from "@chakra-ui/react";
import {
  ExamEnvironmentExamModeration,
  ExamEnvironmentExamModerationStatus,
} from "@prisma/client";

import { rootRoute } from "./root";
import { ProtectedRoute } from "../components/protected-route";
import { UsersWebSocketActivityContext } from "../contexts/users-websocket";
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
import { usersRoute } from "./users";
import { Attempt, Event } from "../types";
import { prettyDate, secondsToHumanReadable } from "../utils/question";
import { moderationKeys } from "../hooks/queries";
import {
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
  useYAxisInverseScale,
  usePlotArea,
} from "recharts";
import { BracketLayer } from "../components/diff-brackets";
import { UsersOnPageAvatars } from "../components/users-on-page-avatars";

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

  return (
    <Box minH="100vh" py={14} px={2} position="relative">
      <HStack position="fixed" top={3} left={8} zIndex={101} gap={3}>
        <Button
          colorPalette="teal"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: attemptsRoute.to })}
        >
          Back to Attempts
        </Button>
        <Button
          colorPalette="teal"
          variant="outline"
          size="sm"
          onClick={() =>
            navigate({
              to: usersRoute.to,
              search: { field: "attempt_id", value: id },
            })
          }
        >
          Manage User
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
      {/* Floating widget: top right */}
      <UsersEditing />
      <Center>
        {attemptQuery.isPending || eventsQuery.isPending ? (
          <Spinner size="xl" />
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
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  return (
    <Box
      position="fixed"
      top={4}
      right="18rem"
      zIndex={100}
      borderRadius="xl"
      boxShadow="lg"
      px={2}
      py={2}
      display="flex"
      alignItems="center"
      gap={4}
    >
      <UsersOnPageAvatars path={window.location.pathname} />
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
  const [yZoomDomain, setYZoomDomain] = useState<[number, number] | null>(null);
  const [yDrag, setYDrag] = useState<{ start: number; current: number } | null>(
    null,
  );
  const yInverseScaleRef = useRef<((pixel: number) => number | null) | null>(
    null,
  );
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
        medianTimePerQuestion,
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
        medianTimePerQuestion,
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
        const questionId = (lastBlurEvent.meta?.question ||
          e.meta?.question) as string;
        const idx = questionId
          ? questionIdToIndexMap.get(questionId)
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
    medianTimePerQuestion,
  } = attemptStatsQuery.data;

  const { correctAnswers, incorrectAnswers, visitEvents, focusGaps } =
    chartData;

  const totalUnfocussedTime = focusGaps.reduce(
    (acc, curr) => acc + (curr.focusTime - curr.blurTime),
    0,
  );
  const preFinalGapDurations = focusGaps
    .filter(
      (f) => f.blurTime <= timeToComplete && f.focusTime <= timeToComplete,
    )
    .map((f) => f.focusTime - f.blurTime);
  const unfocussedTimeBeforeFinal = preFinalGapDurations.reduce(
    (acc, curr) => acc + curr,
    0,
  );
  const medianUnfocussedTimeBeforeFinal = median(preFinalGapDurations);
  const scorePct = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;
  const unfocussedPct =
    timeToComplete > 0 ? (unfocussedTimeBeforeFinal / timeToComplete) * 100 : 0;

  return (
    <>
      <Box
        ref={buttonBoxRef}
        bg={"gray.contrast"}
        position="fixed"
        top={3}
        right="1rem"
        zIndex={100}
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
          colorPalette="green"
          px={4}
          fontWeight="bold"
          fontSize={"2xl"}
          loading={patchModerationStatusByAttemptIdMutation.isPending}
          disabled={patchModerationStatusByAttemptIdMutation.isPending}
          onClick={() => {
            patchModerationStatusByAttemptIdMutation.mutate("Approved");
          }}
        >
          Approve
        </Button>
        <Button
          ref={denyButtonRef}
          colorPalette="red"
          px={4}
          fontWeight="bold"
          fontSize={"2xl"}
          loading={patchModerationStatusByAttemptIdMutation.isPending}
          disabled={patchModerationStatusByAttemptIdMutation.isPending}
          onClick={() => {
            patchModerationStatusByAttemptIdMutation.mutate("Denied");
          }}
        >
          Deny
        </Button>
      </Box>
      <Stack gap={8} w="full" maxW="7xl">
        <Box borderRadius="xl" boxShadow="lg" p={4} mb={4} w="full">
          <Flex
            direction={"row"}
            justifyContent={"space-between"}
            alignItems={"center"}
          >
            <Heading fontWeight="extrabold" fontSize="2xl" mb={2}>
              {attempt.config.name}
            </Heading>
            <Text color="cyan.solid">{prettyDate(attempt.startTime)}</Text>
          </Flex>
          <Flex direction={"column"} mb={4}>
            <SimpleGrid minChildWidth={"230px"} gap={2}>
              <Field.Root alignItems={"center"} display={"flex"}>
                <Field.Label htmlFor="submission-diff" color="fg.muted">
                  Submission Diff
                </Field.Label>
                <Switch.Root
                  id="submission-diff"
                  checked={isSubmissionDiffToggled}
                  onCheckedChange={(e) => setIsSubmissionDiffToggled(e.checked)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control />
                </Switch.Root>
              </Field.Root>
              <Field.Root alignItems={"center"} display={"flex"}>
                <Field.Label htmlFor="submission-time-sort" color="fg.muted">
                  Sort by Submission Time
                </Field.Label>
                <Switch.Root
                  id="submission-time-sort"
                  checked={isSubmissionTimeToggled}
                  onCheckedChange={(e) => setIsSubmissionTimeToggled(e.checked)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control />
                </Switch.Root>
              </Field.Root>
              <Field.Root alignItems={"center"} display={"flex"}>
                <Field.Label htmlFor="submission-timeline" color="fg.muted">
                  Submission Frequency
                </Field.Label>
                <Switch.Root
                  id="submission-timeline"
                  checked={isSubmissionTimelineToggled}
                  onCheckedChange={(e) =>
                    setIsSubmissionTimelineToggled(e.checked)
                  }
                >
                  <Switch.HiddenInput />
                  <Switch.Control />
                </Switch.Root>
              </Field.Root>
              <Field.Root alignItems={"center"} display={"flex"}>
                <Field.Label htmlFor="event-switch" color="fg.muted">
                  Events
                </Field.Label>
                <Switch.Root
                  id="event-switch"
                  checked={isEventsToggled}
                  onCheckedChange={(e) => setIsEventsToggled(e.checked)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control />
                </Switch.Root>
              </Field.Root>
            </SimpleGrid>
            <HStack justifyContent={"flex-end"} minH={8}>
              {yZoomDomain ? (
                <Button
                  size="xs"
                  variant="outline"
                  colorPalette="teal"
                  onClick={() => setYZoomDomain(null)}
                >
                  Reset Zoom ({yZoomDomain[0].toFixed(0)}s -{" "}
                  {yZoomDomain[1].toFixed(0)}s)
                </Button>
              ) : (
                <Text fontSize="xs" color="fg.muted">
                  Drag vertically on chart to zoom y-axis
                </Text>
              )}
            </HStack>
            <Box resize={"vertical"} overflowY={"auto"}>
              <ResponsiveContainer width="100%" minHeight={450}>
                <ComposedChart
                  margin={{ top: 15, right: 20, bottom: 5, left: 0 }}
                  style={{ userSelect: "none", cursor: "ns-resize" }}
                  onMouseDown={(_state, event) => {
                    const y = getChartPixelY(event);
                    if (y !== null) setYDrag({ start: y, current: y });
                  }}
                  onMouseMove={(_state, event) => {
                    if (!yDrag) return;
                    const y = getChartPixelY(event);
                    if (y !== null)
                      setYDrag({ start: yDrag.start, current: y });
                  }}
                  onMouseUp={() => {
                    if (!yDrag) return;
                    const inverse = yInverseScaleRef.current;
                    if (inverse && Math.abs(yDrag.current - yDrag.start) > 5) {
                      const v1 = inverse(yDrag.start);
                      const v2 = inverse(yDrag.current);
                      if (v1 !== null && v2 !== null) {
                        setYZoomDomain([
                          Math.floor(Math.min(v1, v2)),
                          Math.ceil(Math.max(v1, v2)),
                        ]);
                      }
                    }
                    setYDrag(null);
                  }}
                  onMouseLeave={() => setYDrag(null)}
                >
                  <YAxisZoomHelper
                    dragPixels={yDrag}
                    inverseScaleRef={yInverseScaleRef}
                  />
                  <CartesianGrid opacity={0.2} />
                  {isEventsToggled &&
                    focusGaps.map((f, i) => {
                      const y1 = f.blurTime;
                      const y2 = f.focusTime;
                      const time = (y2 - y1).toFixed(2);
                      return (
                        <ReferenceArea
                          key={`focus-gap-${i}`}
                          y1={y1}
                          y2={y2}
                          yAxisId={"left"}
                          ifOverflow="hidden"
                          shape={(props) => (
                            <rect
                              x={props.x}
                              y={props.y}
                              width={props.width}
                              height={props.height}
                              fill="gray"
                              fillOpacity={0.3}
                              stroke="rgba(255, 0, 0, 0.6)"
                              style={{ cursor: "help" }}
                            >
                              <title>{time}s unfocused</title>
                            </rect>
                          )}
                        />
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
                    domain={yZoomDomain ?? [0, "auto"]}
                    allowDataOverflow={!!yZoomDomain}
                    tickFormatter={(v: number) =>
                      String(Math.round(v * 10) / 10)
                    }
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
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
            <Flex
              wrap="wrap"
              rowGap={6}
              mt={2}
              py={4}
              borderTop="1px solid"
              borderBottom="1px solid"
              borderColor="border"
            >
              <StatTile
                label="Score"
                value={`${correct} / ${totalQuestions}`}
                sub={`${answered} answered`}
              >
                <HStack mt={2} gap={2}>
                  <Box
                    flex="1"
                    maxW="110px"
                    h="5px"
                    bg="green.subtle"
                    borderRadius="full"
                    overflow="hidden"
                  >
                    <Box
                      h="full"
                      w={`${scorePct}%`}
                      bg="green.solid"
                      borderRadius="full"
                    />
                  </Box>
                  <Text fontSize="xs" color="fg.muted">
                    {scorePct.toFixed(1)}%
                  </Text>
                </HStack>
              </StatTile>
              <StatTile
                label="Duration"
                value={secondsToHumanReadable(timeToComplete)}
                sub={`${timeToComplete.toFixed(0)}s`}
              />
              <StatTile
                label="Time / question"
                value={`${medianTimePerQuestion}s`}
                unit="μ½"
                sub={`μ ${averageTimePerQuestion}s`}
              />
              <StatTile
                label="Unfocussed pre-final"
                value={`${unfocussedTimeBeforeFinal.toFixed(1)}s`}
                unit={`${unfocussedPct.toFixed(1)}%`}
                sub={`Σ ${totalUnfocussedTime.toFixed(1)}s total · μ½ ${medianUnfocussedTimeBeforeFinal.toFixed(1)}s`}
              />
              <StatTile
                label="Events"
                value={String(events.length)}
                sub={`# periods: ${preFinalGapDurations.length}`}
              />
            </Flex>
            {moderationQuery.data?.feedback && (
              <Text color="fg" py={3}>
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

function getChartPixelY(
  event: ReactMouseEvent<SVGGraphicsElement>,
): number | null {
  const target = event.currentTarget;
  if (!target?.getBoundingClientRect) return null;
  return event.clientY - target.getBoundingClientRect().top;
}

// Rendered inside chart so recharts hooks resolve. Exposes pixel->value
// conversion for the left y-axis, and draws the drag-selection band.
function YAxisZoomHelper({
  dragPixels,
  inverseScaleRef,
}: {
  dragPixels: { start: number; current: number } | null;
  inverseScaleRef: MutableRefObject<((pixel: number) => number | null) | null>;
}) {
  const inverse = useYAxisInverseScale("left");
  const plotArea = usePlotArea();

  useEffect(() => {
    inverseScaleRef.current = inverse
      ? (pixel: number) => {
          const value = inverse(pixel);
          return typeof value === "number" && Number.isFinite(value)
            ? value
            : null;
        }
      : null;
  }, [inverse, inverseScaleRef]);

  if (!dragPixels || !plotArea) return null;
  const y = Math.min(dragPixels.start, dragPixels.current);
  const height = Math.abs(dragPixels.start - dragPixels.current);
  if (height < 2) return null;

  return (
    <rect
      x={plotArea.x}
      y={y}
      width={plotArea.width}
      height={height}
      fill="teal"
      fillOpacity={0.15}
      stroke="teal"
      strokeOpacity={0.5}
      strokeDasharray="4 2"
      pointerEvents="none"
    />
  );
}

function StatTile({
  label,
  value,
  unit,
  sub,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Box
      flex="1 1 0"
      minW="150px"
      px={5}
      borderLeft="1px solid"
      borderColor="border"
      _first={{ borderLeft: "none", pl: 0 }}
    >
      <Text fontSize="sm" color="fg.muted" mb={1}>
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="semibold" color="fg" lineHeight="short">
        {value}
        {unit && (
          <Text
            as="span"
            fontSize="sm"
            fontWeight="normal"
            color="fg.muted"
            ml={1.5}
          >
            {unit}
          </Text>
        )}
      </Text>
      {sub && (
        <Text fontSize="xs" color="fg.muted" mt={1}>
          {sub}
        </Text>
      )}
      {children}
    </Box>
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
    mutationFn: async (userId: string) => {
      const attempts = await getAttemptsByUserId(userId);
      const moderations = await Promise.all(
        attempts.map((a) => getModerationByAttemptId(a.id).catch(() => null)),
      );
      return { attempts, moderations };
    },
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
          colorPalette="teal"
          size="lg"
          onClick={() => attemptsMutation.mutate(attempt.userId)}
          disabled={attemptsMutation.isPending}
          loading={attemptsMutation.isPending}
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
        <AllUserAttempts
          attempts={attemptsMutation.data.attempts}
          moderations={attemptsMutation.data.moderations}
          currentAttemptId={attempt.id}
          options={options}
        />
      )}
    </Center>
  );
}

function AllUserAttempts({
  attempts,
  moderations,
  currentAttemptId,
  options,
}: {
  attempts: Attempt[];
  moderations: (ExamEnvironmentExamModeration | null | undefined)[];
  currentAttemptId: string;
  options: AttemptOptions;
}) {
  if (attempts.length === 0) {
    return null;
  }

  return (
    <Box w="full">
      <Heading size={"md"} mb={4}>
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
              <th style={{ textAlign: "left", padding: "8px" }}>Status</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt, index) => {
              const {
                correct,
                totalQuestions,
                averageTimePerQuestion,
                timeToComplete,
                answered,
              } = getAttemptStats(attempt, options);
              const moderation = moderations[index];
              const isCurrent = attempt.id === currentAttemptId;
              return (
                <tr
                  key={attempt.id}
                  style={{
                    borderBottom: "1px solid #ccc",
                    background: isCurrent ? "rgba(0,128,128,0.15)" : undefined,
                  }}
                >
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
                  <td style={{ padding: "8px" }}>
                    {moderation ? (
                      <Badge
                        colorPalette={
                          moderation.status === "Pending"
                            ? "blue"
                            : moderation.status === "Approved"
                              ? "green"
                              : "red"
                        }
                      >
                        {moderation.status}
                      </Badge>
                    ) : (
                      <Text color="gray.400">—</Text>
                    )}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {moderation?.feedback ? (
                      <Text>{moderation.feedback}</Text>
                    ) : (
                      <Text color="gray.400">—</Text>
                    )}
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

  const submissionTimes = questions
    .map((q) => q.timeSinceStartInS)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);
  const perQuestionTimes = submissionTimes.map((t, i) =>
    i === 0 ? t : t - submissionTimes[i - 1],
  );
  const medianTimePerQuestion =
    perQuestionTimes.length > 0 ? median(perQuestionTimes).toFixed(2) : "0";

  return {
    questions,
    totalQuestions,
    answered,
    correct,
    timeToComplete,
    averageTimePerQuestion,
    medianTimePerQuestion,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
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
