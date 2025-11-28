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
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Tooltip,
  SimpleGrid,
  FormControl,
  FormLabel,
  FormHelperText,
  NumberInput,
  NumberInputField,
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
      <HStack position="fixed" top={6} left={8} zIndex={101} spacing={3}>
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
        {examMetricsQuery.isPending ? (
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
      <Stack spacing={8} w="full" maxW="4xl">
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

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={4}>
            <Heading size="sm" gridColumn="span 3">
              Adjust Histogram Parameters
            </Heading>
            <FormControl>
              <Tooltip label="Minimum attempt time in seconds to include in the distribution">
                <FormLabel color="gray.300">Min Attempt Time [s]</FormLabel>
              </Tooltip>
              <NumberInput
                value={minAttemptTimeInS}
                onChange={(_, v) => handleNumberChange(v, setMinAttemptTimeInS)}
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
                value={minQuestionsAnswered}
                onChange={(_, v) =>
                  handleNumberChange(v, setMinQuestionsAnswered)
                }
                min={0}
                inputMode="numeric"
              >
                <NumberInputField bg="gray.700" color="gray.100" />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Sigma</FormLabel>
              <NumberInput
                value={sigma}
                onChange={(_, v) => handleNumberChange(v, setSigma)}
                inputMode="numeric"
              >
                <NumberInputField bg="gray.700" color="gray.100" />
              </NumberInput>
              <FormHelperText>
                Adjust how many brackets are used in the histogram
              </FormHelperText>
            </FormControl>
          </SimpleGrid>

          <AttemptStats
            attempts={attempts}
            minAttemptTimeInS={minAttemptTimeInS}
            minQuestionsAnswered={minQuestionsAnswered}
          />
          <Divider my={2} borderColor="gray.800" />
          <TimeTakenDistribution
            attempts={attempts}
            exam={exam}
            sigma={sigma}
            minAttemptTimeInS={minAttemptTimeInS}
            minQuestionsAnswered={minQuestionsAnswered}
          />
          {/* <AverageTimePerQuestionDistribution {...{ attempts }} /> */}

          <Divider my={4} borderColor="gray.600" />
          <Heading size="md" color={accent} mt={8} mb={2} id="exam-questions">
            Exam Questions
          </Heading>
          <Text color="gray.300" mb={2}>
            View the exam questions along with how often each question and
            answer were seen and submitted.
          </Text>
          <Box bg="gray.700" borderRadius="lg" p={4} mt={2}>
            <QuestionsView {...{ exam, attempts, generations }} />
          </Box>
        </Box>
      </Stack>
    </>
  );
}

function AttemptStats({
  attempts,
  minAttemptTimeInS,
  minQuestionsAnswered,
}: {
  attempts: ExamEnvironmentExamAttempt[];
  minAttemptTimeInS: number;
  minQuestionsAnswered: number;
}) {
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

  const sampledAttempts = filteredAttempts.length;

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

  return (
    <Box overflowX="auto" borderRadius="md" bg="black" p={2}>
      <Table variant="simple" size="sm" colorScheme="teal">
        <Thead>
          <Tr>
            <Th color="teal.300">Metric</Th>
            <Th color="gray.200">Value</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td color="gray.100" fontWeight="bold">
              <Tooltip label="Number of random attempts taken from database">
                Sampled Attempts
              </Tooltip>
            </Td>
            <Td color="gray.100">{sampledAttempts}</Td>
          </Tr>
          <Tr>
            <Td color="gray.100" fontWeight="bold">
              <Tooltip label="sum(Final Question Submission Time - Start Time) / len(Attempts)">
                Average Time Spent [HH:MM:SS]
              </Tooltip>
            </Td>
            <Td color="gray.100">
              {secondsToHumanReadable(Math.floor(avgTimeSpent))}
            </Td>
          </Tr>
          <Tr>
            <Td color="gray.100" fontWeight="bold">
              <Tooltip label="sum(Question Submission Time) / len(Attempts)">
                Average Question Submission Time [s]
              </Tooltip>
            </Td>
            <Td color="gray.100">{avgTimePerQuestion.toFixed(2)}</Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
}

function QuestionsView({ exam, attempts, generations }: ViewExamMetricsProps) {
  const cardBg = useColorModeValue("gray.900", "gray.900");
  return (
    <Box bg={cardBg} borderRadius="lg" p={4} mb={4}>
      <Stack spacing={4}>
        {exam.questionSets
          .flatMap((qs) => {
            const questions = qs.questions.map((q) => ({
              ...q,
              context: qs.context,
            }));
            return questions;
          })
          .map((q) => {
            // 1. Percentage of attempts that saw this question
            //   - If the attempt's related generation included this question
            // 2. Percentage of **those** attempts that submitted this question
            //   - If the attempt's `question.submissionTime` field is non-null
            // 3. Percentage of attempts that saw each answer
            //   - If the attempt's related generation included this answer
            // 4. Percentage of **those** attempts that selected each answer
            const seenBy = attempts.filter((attempt) => {
              const generation = generations.find(
                (gen) => gen.id === attempt.generatedExamId
              );
              if (!generation) return false;
              return generation.questionSets
                .flatMap((gqs) => gqs.questions.map((q) => q.id))
                .includes(q.id);
            }).length;

            const submittedBy = attempts.filter((attempt) => {
              const submittedQuestion = attempt.questionSets
                .flatMap((aqs) => aqs.questions)
                .find((aq) => aq.id === q.id);
              return !!submittedQuestion;
            }).length;

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

            const question = {
              ...q,
              stats: {
                seenBy,
                submittedBy,
              },
              answers,
            };

            return <QuestionCard key={q.id} question={question} />;
          })}
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
  };
  answers: AnswerWithStats[];
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
          <Box textAlign="right" ml={4} minW="120px">
            <Text color="gray.400" fontSize="sm">
              Seen by: {question.stats.seenBy} attempts
            </Text>
            <Text color="gray.400" fontSize="sm">
              Submitted by: {question.stats.submittedBy} attempts
            </Text>
          </Box>
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
