import { useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createRoute, useParams, useNavigate } from "@tanstack/react-router";
import {
  Box,
  Button,
  Center,
  Heading,
  Stack,
  Text,
  useColorModeValue,
  HStack,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Tooltip,
  SimpleGrid,
  FormControl,
  FormLabel,
  FormHelperText,
  NumberInput,
  NumberInputField,
  Flex,
} from "@chakra-ui/react";
import type {
  ExamCreatorExam,
  ExamEnvironmentAnswer,
  ExamEnvironmentExamAttempt,
  ExamEnvironmentGeneratedExam,
  ExamEnvironmentMultipleChoiceQuestion,
  ExamEnvironmentQuestionSet,
} from "@prisma/client";

import { rootRoute } from "./root";
import { getExamMetricsById } from "../utils/fetch";
import { ProtectedRoute } from "../components/protected-route";
import { UsersWebSocketActivityContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { metricsRoute } from "./metrics";
import { parseMarkdown, secondsToHumanReadable } from "../utils/question";
import { TimeTakenDistribution } from "../components/time-taken-distribution";

function View() {
  const { id } = useParams({ from: "/metrics/exams/$id" });
  const { user, logout } = useContext(AuthContext)!;

  const navigate = useNavigate();

  const examMetricsQuery = useQuery({
    queryKey: ["metrics", id],
    enabled: !!user,
    queryFn: () => getExamMetricsById(id!),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const bg = useColorModeValue("black", "black");
  const spinnerColor = useColorModeValue("teal.400", "teal.300");
  return (
    <Box minH="100vh" bg={bg} py={8} px={2} position="relative">
      {/* Back to Dashboard and Logout buttons */}
      <HStack position="fixed" top={3} left={8} zIndex={101} spacing={3}>
        <Button
          colorScheme="teal"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: metricsRoute.to })}
        >
          Back to Exams Metrics
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
        {examMetricsQuery.isFetching || examMetricsQuery.isPending ? (
          <Spinner color={spinnerColor} size="xl" />
        ) : examMetricsQuery.isError ? (
          <Text color="red.400" fontSize="lg">
            Error loading exam: {examMetricsQuery.error.message}
          </Text>
        ) : (
          <ViewExamMetrics
            exam={examMetricsQuery.data.exam}
            attempts={examMetricsQuery.data.attempts}
            generations={examMetricsQuery.data.generations}
          />
        )}
      </Center>
    </Box>
  );
}

interface ViewExamMetricsProps {
  exam: ExamCreatorExam;
  attempts: ExamEnvironmentExamAttempt[];
  generations: ExamEnvironmentGeneratedExam[];
}

function ViewExamMetrics({
  exam,
  attempts,
  generations,
}: ViewExamMetricsProps) {
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const [sigma, setSigma] = useState(50);
  const [minAttemptTimeInS, setMinAttemptTimeInS] = useState<number>(0);
  const [minQuestionsAnswered, setMinQuestionsAnswered] = useState<number>(0);

  const filteredAttemptsQuery = useQuery({
    queryKey: [
      "filtered-attempts",
      exam.id,
      minAttemptTimeInS,
      minQuestionsAnswered,
    ],
    queryFn: () => {
      const filteredAttempts = attempts.filter((a) => {
        const startTimeInMS = a.startTime.getTime();
        const flattened = a.questionSets.flatMap((qs) => qs.questions);

        const questionsAnswered = flattened.filter(
          (f) => !!f.submissionTime
        ).length;
        if (questionsAnswered < minQuestionsAnswered) {
          return false;
        }

        const lastSubmission = Math.max(
          ...flattened.map((f) => f.submissionTime?.getTime() ?? 0)
        );
        const timeToComplete = (lastSubmission - startTimeInMS) / 1000;

        return timeToComplete > minAttemptTimeInS;
      });
      return filteredAttempts;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });

    return () => {
      updateActivity({
        page: new URL(window.location.href),
        lastActive: Date.now(),
      });
    };
  }, [exam]);

  const cardBg = useColorModeValue("gray.900", "gray.900");
  const accent = useColorModeValue("teal.400", "teal.300");

  function handleNumberChange(
    n: number,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) {
    if (isNaN(n) || n < 0) {
      setter(0);
    } else {
      setter(n);
    }
  }

  return (
    <>
      <Stack spacing={8} w="full" maxW="7xl">
        <Box bg={cardBg} borderRadius="xl" boxShadow="lg" p={8} mb={4} w="full">
          <Heading color={accent} fontWeight="extrabold" fontSize="2xl" mb={2}>
            {exam.config.name}
          </Heading>
          <Divider my={4} borderColor="gray.600" />
          <Heading size="md" color={accent} mt={6} mb={2}>
            Exam Metrics
          </Heading>
          <Text color="gray.300" mb={2}>
            This is the analysis of the exam attempts:
          </Text>

          <Heading size="sm" gridColumn="span 3">
            Adjust Histogram Parameters
          </Heading>
          <SimpleGrid minChildWidth={"230px"} spacing={6} mb={4} mt={2}>
            <FormControl>
              <Tooltip label="Minimum attempt time in seconds to include in the distribution">
                <FormLabel color="gray.300">Min Attempt Time [s]</FormLabel>
              </Tooltip>
              <NumberInput
                // value={minAttemptTimeInS}
                defaultValue={0}
                // onChange={(_, v) => handleNumberChange(v, setMinAttemptTimeInS)}
                onBlur={(e) => {
                  const v = parseInt(e.target.value);
                  handleNumberChange(v, setMinAttemptTimeInS);
                }}
                min={0}
                inputMode="numeric"
              >
                <NumberInputField bg="gray.700" color="gray.100" />
              </NumberInput>
            </FormControl>
            <FormControl>
              <Tooltip label="Minimum number of questions answered to include in the distribution">
                <FormLabel color="gray.300">
                  Min Questions Answered [#]
                </FormLabel>
              </Tooltip>
              <NumberInput
                // value={minQuestionsAnswered}
                defaultValue={0}
                // onChange={(_, v) =>
                //   handleNumberChange(v, setMinQuestionsAnswered)
                // }
                onBlur={(e) => {
                  const v = parseInt(e.target.value);
                  handleNumberChange(v, setMinQuestionsAnswered);
                }}
                min={0}
                inputMode="numeric"
              >
                <NumberInputField bg="gray.700" color="gray.100" />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Sigma</FormLabel>
              <NumberInput
                // value={sigma}
                defaultValue={50}
                min={1}
                // onChange={(_, v) => handleNumberChange(v, setSigma)}
                onBlur={(e) => {
                  const v = parseInt(e.target.value);
                  handleNumberChange(v, setSigma);
                }}
                inputMode="numeric"
              >
                <NumberInputField bg="gray.700" color="gray.100" />
              </NumberInput>
              <FormHelperText>
                Adjust how many brackets are used in the histogram
              </FormHelperText>
            </FormControl>
          </SimpleGrid>

          {filteredAttemptsQuery.isFetching || !filteredAttemptsQuery.data ? (
            <Spinner size="sm" color="teal.400" />
          ) : filteredAttemptsQuery.isError ? (
            <Text color="red.400">
              Error filtering attempts: {filteredAttemptsQuery.error.message}
            </Text>
          ) : (
            <>
              <AttemptStats attempts={filteredAttemptsQuery.data} />
              <Divider my={2} borderColor="gray.800" />
              <TimeTakenDistribution
                attempts={filteredAttemptsQuery.data}
                exam={exam}
                sigma={sigma}
              />
              {/* <AverageTimePerQuestionDistribution {...{ attempts }} /> */}

              <Divider my={4} borderColor="gray.600" />
              <Heading
                size="md"
                color={accent}
                mt={8}
                mb={2}
                id="exam-questions"
              >
                Exam Questions
              </Heading>
              <Text color="gray.300" mb={2}>
                View the exam questions along with how often each question and
                answer were seen and submitted.
              </Text>
              {/* Sort questions by difficulty - ascending or descending */}
              <Box bg="gray.700" borderRadius="lg" p={4} mt={2}>
                <QuestionsView
                  {...{
                    exam,
                    attempts: filteredAttemptsQuery.data,
                    generations,
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      </Stack>
    </>
  );
}

function AttemptStats({
  attempts,
}: {
  attempts: ExamEnvironmentExamAttempt[];
}) {
  const statsQuery = useQuery({
    queryKey: ["attempt-stats", attempts],
    queryFn: async () => {
      const sampledAttempts = attempts.length;

      const avg = attempts.reduce(
        (acc, attempt) => {
          const startTimeInMS = attempt.startTime.getTime();
          const flattened = attempt.questionSets.flatMap((qs) => qs.questions);

          if (flattened.length === 0) {
            return acc;
          }

          const answered = flattened.filter((f) => {
            return !!f.submissionTime;
          }).length;
          const lastSubmission = Math.max(
            ...flattened.map((f) => {
              return f.submissionTime?.getTime() ?? 0;
            })
          );
          const timeToComplete = (lastSubmission - startTimeInMS) / 1000;

          const averageTimePerQuestion =
            answered > 0 ? timeToComplete / answered : 0;

          return {
            sumTimeSpent: acc.sumTimeSpent + timeToComplete,
            sumTimePerQuestion: acc.sumTimePerQuestion + averageTimePerQuestion,
          };
        },
        { sumTimeSpent: 0, sumTimePerQuestion: 0 }
      );

      const avgTimeSpent =
        sampledAttempts > 0 ? avg.sumTimeSpent / sampledAttempts : 0;
      const avgTimePerQuestion =
        sampledAttempts > 0 ? avg.sumTimePerQuestion / sampledAttempts : 0;
      return { sampledAttempts, avgTimeSpent, avgTimePerQuestion };
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (statsQuery.isPending) {
    return <Spinner color="teal.300" />;
  }

  if (statsQuery.isError) {
    return (
      <Text color="red.400">
        Error calculating attempt stats: {statsQuery.error.message}
      </Text>
    );
  }

  const { sampledAttempts, avgTimeSpent, avgTimePerQuestion } = statsQuery.data;

  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
      <Tooltip label="Number of attempts included in this analysis after applying filters">
        <Card bg="gray.800" borderRadius="lg" boxShadow="md" cursor="help">
          <CardBody>
            <Stack spacing={2}>
              <Heading size="sm" color="teal.300">
                Sampled Attempts
              </Heading>
              <Text fontSize="2xl" fontWeight="bold" color="gray.100">
                {sampledAttempts}
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Tooltip>

      <Tooltip label="Average time from exam start to final question submission: sum(Final Submission Time - Start Time) / number of attempts">
        <Card bg="gray.800" borderRadius="lg" boxShadow="md" cursor="help">
          <CardBody>
            <Stack spacing={2}>
              <Heading size="sm" color="teal.300">
                Average Time Spent
              </Heading>
              <Text fontSize="2xl" fontWeight="bold" color="gray.100">
                {secondsToHumanReadable(Math.floor(avgTimeSpent))}
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Tooltip>

      <Tooltip label="Average time per question answered: sum(Question Submission Time) / total questions answered">
        <Card bg="gray.800" borderRadius="lg" boxShadow="md" cursor="help">
          <CardBody>
            <Stack spacing={1}>
              <Heading size="sm" color="teal.300">
                Average Question Time
              </Heading>
              <Text fontSize="2xl" fontWeight="bold" color="gray.100">
                {avgTimePerQuestion.toFixed(2)}s
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Tooltip>
    </SimpleGrid>
  );
}

function QuestionsView({ exam, attempts, generations }: ViewExamMetricsProps) {
  const [sortKey, setSortKey] = useState<
    "difficulty" | "exam" | "time-spent" | "correct" | "submitted-by"
  >("difficulty");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pre-calculate all questions with their stats to get min/max difficulty
  const questionsWithStats = (() => {
    const noDifficulty = exam.questionSets
      .flatMap((qs) =>
        qs.questions.map((q) => ({
          ...q,
          context: qs.context,
        }))
      )
      .map((q, i) => {
        // Number of attempts whose generation included this question
        const seenBy = attempts.filter((attempt) => {
          const generation = generations.find(
            (gen) => gen.id === attempt.generatedExamId
          );
          if (!generation) return false;
          return generation.questionSets
            .flatMap((gqs) => gqs.questions.map((q) => q.id))
            .includes(q.id);
        }).length;

        const attemptsWhoSubmittedQuestion = attempts.filter((attempt) => {
          const submittedQuestion = attempt.questionSets
            .flatMap((aqs) => aqs.questions)
            .find((aq) => aq.id === q.id);
          return !!submittedQuestion;
        });

        // Number of attempts who submitted this question
        const submittedBy = attemptsWhoSubmittedQuestion.length;

        // Array of all submitted attempts time spents
        const timeSpents = attemptsWhoSubmittedQuestion.reduce(
          (acc, attempt) => {
            const flattenedQuestions = attempt.questionSets
              .flatMap((aqs) => aqs.questions)
              // Sorted to handle when questions are not submitted in order
              .sort((a, b) => {
                const aTime = a.submissionTime
                  ? a.submissionTime.getTime()
                  : Infinity;
                const bTime = b.submissionTime
                  ? b.submissionTime.getTime()
                  : Infinity;
                return aTime - bTime;
              });

            const questionIndex = flattenedQuestions.findIndex(
              (fq) => fq.id === q.id
            );
            if (questionIndex === -1) {
              return acc;
            }

            const question = flattenedQuestions[questionIndex];
            const submissionTime = question.submissionTime.getTime();

            let previousTime =
              questionIndex === 0
                ? attempt.startTime.getTime()
                : flattenedQuestions[
                    questionIndex - 1
                  ].submissionTime.getTime();

            const timeSpentOnQuestion = (submissionTime - previousTime) / 1000;

            acc.push(timeSpentOnQuestion);
            return acc;
          },
          [] as number[]
        );

        const totalTimeSpent = timeSpents.reduce((acc, t) => {
          return acc + t;
        }, 0);

        const timeSpent =
          timeSpents.length > 0 ? totalTimeSpent / timeSpents.length : 0;

        // Percentage of attempts who submitted an answer + got the correct answer
        const percentageCorrect =
          (attempts.filter((attempt) => {
            const submittedQuestion = attempt.questionSets
              .flatMap((aqs) => aqs.questions)
              .find((aq) => aq.id === q.id);
            if (!submittedQuestion) return false;
            const selectedCorrectAnswer = submittedQuestion.answers
              .map((aid) =>
                q.answers.find((qa) => qa.id === aid && qa.isCorrect)
              )
              .filter((a) => !!a);
            return selectedCorrectAnswer.length > 0;
          }).length /
            Math.max(submittedBy, 1)) *
          100;

        const answers = q.answers.map((answer) => {
          const seenBy = attempts.filter((attempt) => {
            const generation = generations.find(
              (gen) => gen.id === attempt.generatedExamId
            );
            if (!generation) return false;
            return generation.questionSets
              .flatMap((gqs) => gqs.questions.flatMap((qqs) => qqs.answers))
              .includes(answer.id);
          }).length;

          const submittedBy = attempts.filter((attempt) => {
            const attemptAnswers = attempt.questionSets.flatMap((aqs) =>
              aqs.questions.flatMap((aq) => aq.answers)
            );
            return attemptAnswers.includes(answer.id);
          }).length;

          return {
            ...answer,
            stats: {
              seenBy,
              submittedBy,
            },
          };
        });

        return {
          ...q,
          stats: {
            seenBy,
            submittedBy,
            timeSpent,
            percentageCorrect,
          },
          answers,
          i,
        };
      });

    let maxTimeSpent = 0;
    let minTimeSpent = Infinity;

    for (const q of noDifficulty) {
      if (q.stats.timeSpent > maxTimeSpent) {
        maxTimeSpent = q.stats.timeSpent;
      }
      if (q.stats.timeSpent < minTimeSpent) {
        minTimeSpent = q.stats.timeSpent;
      }
    }

    const withDifficulty = noDifficulty.map((q) => {
      // Time spent on a question is normalized to have the same weight as the percentage correct
      const normalizedTimeSpent =
        (q.stats.timeSpent - minTimeSpent) / (maxTimeSpent - minTimeSpent);
      const difficulty =
        normalizedTimeSpent / (q.stats.percentageCorrect / 100 + 1);

      return {
        ...q,
        stats: {
          ...q.stats,
          difficulty,
        },
      };
    });

    return withDifficulty;
  })();

  const difficulties = questionsWithStats
    .map((q) => q.stats.difficulty)
    .filter((d) => !isNaN(d));
  const minDifficulty = difficulties.length > 0 ? Math.min(...difficulties) : 0;
  const maxDifficulty = difficulties.length > 0 ? Math.max(...difficulties) : 0;

  const cardBg = useColorModeValue("gray.900", "gray.900");
  return (
    <Box bg={cardBg} borderRadius="lg" p={4} mb={4}>
      <Stack spacing={4}>
        <Box>
          <Heading size="sm" mb={3} color={"teal.300"}>
            Questions Overview
          </Heading>
          <Flex direction="row" justifyContent={"center"}>
            <Tooltip label="Lowest difficulty score among all questions">
              <Box bg="gray.700" p={3} borderRadius="md" cursor="help" mr={1}>
                <Text color="gray.400" fontSize="xs" fontWeight="bold">
                  Min Difficulty
                </Text>
                <Text color="teal.300" fontSize="lg" fontWeight="bold">
                  {minDifficulty.toFixed(2)}
                </Text>
              </Box>
            </Tooltip>
            <Tooltip label="Highest difficulty score among all questions">
              <Box bg="gray.700" p={3} borderRadius="md" cursor="help" ml={1}>
                <Text color="gray.400" fontSize="xs" fontWeight="bold">
                  Max Difficulty
                </Text>
                <Text color="teal.300" fontSize="lg" fontWeight="bold">
                  {maxDifficulty.toFixed(2)}
                </Text>
              </Box>
            </Tooltip>
          </Flex>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            <FormControl>
              <FormLabel color="gray.300" fontSize="sm" fontWeight="bold">
                Sort By
              </FormLabel>
              <select
                value={sortKey}
                onChange={(e) =>
                  setSortKey(
                    e.target.value as
                      | "difficulty"
                      | "exam"
                      | "time-spent"
                      | "correct"
                      | "submitted-by"
                  )
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "6px",
                  backgroundColor: "#2D3748",
                  color: "#E2E8F0",
                  border: "1px solid #4A5568",
                }}
              >
                <option value="difficulty">Difficulty</option>
                <option value="exam">Exam Order</option>
                <option value="time-spent">Time Spent</option>
                <option value="correct">Correct %</option>
                <option value="submitted-by">Submitted By</option>
              </select>
            </FormControl>
            <FormControl>
              <FormLabel color="gray.300" fontSize="sm" fontWeight="bold">
                Order
              </FormLabel>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "6px",
                  backgroundColor: "#2D3748",
                  color: "#E2E8F0",
                  border: "1px solid #4A5568",
                }}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </FormControl>
          </SimpleGrid>
        </Box>

        <Stack spacing={4}>
          {questionsWithStats
            .sort((a, b) => {
              // exam order: use examOrder numeric field
              if (sortKey === "exam") {
                return sortOrder === "asc"
                  ? (a as any).examOrder - (b as any).examOrder
                  : (b as any).examOrder - (a as any).examOrder;
              }

              if (sortKey === "time-spent") {
                const ta = a.stats.timeSpent || 0;
                const tb = b.stats.timeSpent || 0;
                return sortOrder === "asc" ? ta - tb : tb - ta;
              }

              if (sortKey === "correct") {
                const ca = a.stats.percentageCorrect || 0;
                const cb = b.stats.percentageCorrect || 0;
                return sortOrder === "asc" ? ca - cb : cb - ca;
              }

              if (sortKey === "submitted-by") {
                const sa = a.stats.submittedBy || 0;
                const sb = b.stats.submittedBy || 0;
                return sortOrder === "asc" ? sa - sb : sb - sa;
              }

              // default: difficulty
              const diffA = a.stats.difficulty || 0;
              const diffB = b.stats.difficulty || 0;
              return sortOrder === "asc" ? diffA - diffB : diffB - diffA;
            })
            .map((question) => {
              return <QuestionCard key={question.id} question={question} />;
            })}
        </Stack>
      </Stack>
    </Box>
  );
}

type AnswerWithStats = ExamEnvironmentAnswer & {
  stats: {
    seenBy: number;
    submittedBy: number;
  };
};
type QuestionWithStats = Omit<
  ExamEnvironmentMultipleChoiceQuestion,
  "answers"
> & {
  context: ExamEnvironmentQuestionSet["context"];
  stats: {
    seenBy: number;
    submittedBy: number;
    timeSpent: number;
    percentageCorrect: number;
    difficulty: number;
  };
  answers: AnswerWithStats[];
  // Used to track original order as set in the exam
  i: number;
};

function QuestionCard({ question }: { question: QuestionWithStats }) {
  return (
    <Box position="relative" mb={4}>
      <Card
        bg="gray.800"
        borderRadius="xl"
        boxShadow="md"
        position="relative"
        zIndex={1}
      >
        <CardHeader px={4} py={3}>
          <Box maxW="100%" overflowX="auto">
            <Heading size="md" color="teal.300" maxW="100%">
              Question {question.id}
            </Heading>
            {!!question.context && (
              <>
                <Heading size="sm" color="gray.400" maxW="100%">
                  Context
                </Heading>
                <Box
                  color="gray.300"
                  fontSize="sm"
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdown(question.context),
                  }}
                />
              </>
            )}
            <Heading size="sm" color="gray.400" maxW="100%">
              Text
            </Heading>
            <Box
              color="gray.300"
              fontSize="sm"
              dangerouslySetInnerHTML={{
                __html: parseMarkdown(question.text),
              }}
            />
          </Box>
        </CardHeader>
        <CardBody pt={0}>
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={3} mb={4}>
            <Tooltip label="Number of attempts that included this question">
              <Box bg="gray.700" p={3} borderRadius="md" cursor="help">
                <Text color="gray.400" fontSize="xs" fontWeight="bold">
                  Seen By
                </Text>
                <Text color="teal.300" fontSize="lg" fontWeight="bold">
                  {question.stats.seenBy}
                </Text>
              </Box>
            </Tooltip>

            <Tooltip label="Number of attempts that submitted an answer to this question">
              <Box bg="gray.700" p={3} borderRadius="md" cursor="help">
                <Text color="gray.400" fontSize="xs" fontWeight="bold">
                  Submitted By
                </Text>
                <Text color="teal.300" fontSize="lg" fontWeight="bold">
                  {question.stats.submittedBy}
                </Text>
              </Box>
            </Tooltip>

            <Tooltip label="Average time spent on this question from start to submission">
              <Box bg="gray.700" p={3} borderRadius="md" cursor="help">
                <Text color="gray.400" fontSize="xs" fontWeight="bold">
                  Time Spent
                </Text>
                <Text color="teal.300" fontSize="lg" fontWeight="bold">
                  {question.stats.timeSpent.toFixed(2)}s
                </Text>
              </Box>
            </Tooltip>

            <Tooltip label="Percentage of submitted answers that selected a correct option">
              <Box bg="gray.700" p={3} borderRadius="md" cursor="help">
                <Text color="gray.400" fontSize="xs" fontWeight="bold">
                  Correct
                </Text>
                <Text color="teal.300" fontSize="lg" fontWeight="bold">
                  {question.stats.percentageCorrect.toFixed(2)}%
                </Text>
              </Box>
            </Tooltip>

            <Tooltip label="Normalized Time Spent divided by Percent Correct - higher indicates more difficult questions">
              <Box bg="gray.700" p={3} borderRadius="md" cursor="help">
                <Text color="gray.400" fontSize="xs" fontWeight="bold">
                  Difficulty
                </Text>
                <Text color="teal.300" fontSize="lg" fontWeight="bold">
                  {question.stats.difficulty.toFixed(2)}
                </Text>
              </Box>
            </Tooltip>
          </SimpleGrid>
        </CardBody>
        <CardFooter>
          <Stack spacing={3} w="full">
            {question.answers.map((answer) => (
              <Box
                key={answer.id}
                p={3}
                bg="gray.700"
                borderRadius="md"
                borderColor={answer.isCorrect ? "green.400" : undefined}
                borderWidth={answer.isCorrect ? 2 : 0}
              >
                <Box
                  color="gray.300"
                  fontSize="sm"
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdown(answer.text),
                  }}
                />
                <Box textAlign="right" minW="120px">
                  <Text color="gray.400" fontSize="sm">
                    Seen by: {answer.stats.seenBy} attempts
                  </Text>
                  <Text color="gray.400" fontSize="sm">
                    Selected by: {answer.stats.submittedBy} attempts
                  </Text>
                </Box>
              </Box>
            ))}
          </Stack>
        </CardFooter>
      </Card>
    </Box>
  );
}

export const viewMetricsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/metrics/exams/$id",
  component: () => (
    <ProtectedRoute>
      <View />
    </ProtectedRoute>
  ),
});
