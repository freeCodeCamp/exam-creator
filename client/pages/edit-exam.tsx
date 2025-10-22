import { useState, useContext, useReducer, useEffect } from "react";
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
  Avatar,
  Tooltip,
  HStack,
  Divider,
  Spinner,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from "@chakra-ui/react";
import type {
  ExamCreatorExam,
  ExamEnvironmentChallenge,
  ExamEnvironmentConfig,
} from "@prisma/client";

import { rootRoute } from "./root";
import { QuestionForm } from "../components/question-form";
import {
  getExamById,
  getExamChallengeByExamId,
  getGenerations,
} from "../utils/fetch";
import { TagConfigForm } from "../components/tag-config-form";
import { ProtectedRoute } from "../components/protected-route";
import { QuestionSearch } from "../components/question-search";
import { EditExamActions } from "../components/edit-exam-actions";
import { QuestionTypeConfigForm } from "../components/question-type-config-form";
import {
  UsersWebSocketActivityContext,
  UsersWebSocketUsersContext,
} from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { examsRoute } from "./exams";
import { EditExamGenerationVariability } from "../components/edit-exam-generation-variability";
import { EditExamConfig } from "../components/edit-exam-config";
import { ConfigView } from "../components/config-view";

function Edit() {
  const { id } = useParams({ from: "/exams/$id" });
  const { user, logout } = useContext(AuthContext)!;

  const navigate = useNavigate();

  const examQuery = useQuery({
    queryKey: ["exam", id],
    enabled: !!user,
    queryFn: () => getExamById(id!),
    retry: false,
    refetchOnWindowFocus: false,
    // TODO: This does not work, because it overwrites the current edit before a save
    //       Somehow, the client must always PUT before GET
    //       Potentially, a PATCH request must be used with only the changed data to prevent unwanted overwrites
    // refetchInterval: 5000,
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
          onClick={() => navigate({ to: examsRoute.to })}
        >
          Back to Exams
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
        {examQuery.isPending ? (
          <Spinner color={spinnerColor} size="xl" />
        ) : examQuery.isError ? (
          <Text color="red.400" fontSize="lg">
            Error loading exam: {examQuery.error.message}
          </Text>
        ) : (
          <EditExam exam={examQuery.data} />
        )}
      </Center>
    </Box>
  );
}

function UsersEditing() {
  const { users, error: usersError } = useContext(UsersWebSocketUsersContext)!;

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

function examReducer(state: ExamCreatorExam, action: Partial<ExamCreatorExam>) {
  const newState = { ...state, ...action };
  return newState;
}

function configReducer(
  state: ExamEnvironmentConfig,
  action: Partial<ExamEnvironmentConfig>
) {
  const newState = { ...state, ...action };
  return newState;
}

interface EditExamProps {
  exam: ExamCreatorExam;
}

function EditExam({ exam: examData }: EditExamProps) {
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const [exam, setExam] = useReducer(examReducer, examData);
  const [config, setConfig] = useReducer(configReducer, exam.config);
  const [questionSets, setQuestionSets] = useState(exam.questionSets);

  const [searchIds, setSearchIds] = useState<string[]>([]);

  const examEnvironmentChallengesQuery = useQuery({
    queryKey: ["exam-challenge", exam.id],
    queryFn: () => getExamChallengeByExamId(exam.id),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [examEnvironmentChallenges, setExamEnvironmentChallenges] = useState<
    Omit<ExamEnvironmentChallenge, "id">[]
  >(examEnvironmentChallengesQuery.data || []);

  const generatedExamsStagingQuery = useQuery({
    queryKey: ["generated-exams", exam.id, "Staging"],
    queryFn: () =>
      getGenerations({
        examId: exam.id,
        databaseEnvironment: "Staging",
      }),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const generatedExamsProductionQuery = useQuery({
    queryKey: ["generated-exams", exam.id, "Production"],
    queryFn: () =>
      getGenerations({
        examId: exam.id,
        databaseEnvironment: "Production",
      }),
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

  useEffect(() => {
    if (examEnvironmentChallengesQuery.data) {
      setExamEnvironmentChallenges(examEnvironmentChallengesQuery.data);
    }
  }, [examEnvironmentChallengesQuery.data]);

  // const discardExamStateMutation = useMutation({
  //   mutationFn: (examId: ExamCreatorExam["id"]) => {
  //     return discardExamStateById(accessToken!, examId);
  //   },
  //   onSuccess(data, _variables, _context) {
  //     setExam(data);
  //   },
  // });

  const cardBg = useColorModeValue("gray.900", "gray.900");
  const accent = useColorModeValue("teal.400", "teal.300");

  // { [type]: { numberOfSet: number, numberOfQuestions: number } }
  const questionsBySet = exam.questionSets.reduce((acc, qs) => {
    if (qs.type in acc) {
      acc[qs.type].numberOfSet += 1;
      acc[qs.type].numberOfQuestions += qs.questions.length;
    } else {
      acc[qs.type] = {
        numberOfSet: 1,
        numberOfQuestions: qs.questions.length,
      };
    }
    return acc;
  }, {} as { [key: string]: { numberOfSet: number; numberOfQuestions: number } });

  return (
    <>
      <EditExamActions
        {...{ exam, config, questionSets, examEnvironmentChallenges }}
      />
      <Stack spacing={8} w="full" maxW="4xl">
        <Box bg={cardBg} borderRadius="xl" boxShadow="lg" p={8} mb={4} w="full">
          <Heading color={accent} fontWeight="extrabold" fontSize="2xl" mb={2}>
            Edit Exam
          </Heading>
          <QuestionSearch
            exam={exam}
            setSearchIds={setSearchIds}
            searchIds={searchIds}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <EditExamConfig
              {...{
                exam,
                setExam,
                config,
                setConfig,
                examEnvironmentChallengesQuery,
                examEnvironmentChallenges,
                setExamEnvironmentChallenges,
              }}
            />
            <Divider my={4} borderColor="gray.600" />
            <Heading size="md" color={accent} mb={2} id="current-configs-main">
              Configure Question Distribution
            </Heading>

            <Text color="gray.300" mb={2}>
              This section allows you to configure how many questions you want
              to add to the exam for a specific topic.
            </Text>

            <Box mb={4}>
              <Box overflowX="auto" borderRadius="md" bg="black" p={2}>
                <Table variant="simple" size="sm" colorScheme="teal">
                  <Thead>
                    <Tr>
                      <Th color="teal.300">Set Type</Th>
                      <Th color="gray.200">Number of Set</Th>
                      <Th color="gray.200">Number of Questions (total)</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Object.entries(questionsBySet).map(([type, data]) => (
                      <Tr key={type}>
                        <Td color="gray.100" fontWeight="bold">
                          {type}
                        </Td>
                        <Td color="gray.100">{data.numberOfSet}</Td>
                        <Td color="gray.100">{data.numberOfQuestions}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
            <EditExamGenerationVariability
              generatedExamsStaging={generatedExamsStagingQuery.data}
              generatedExamsProduction={generatedExamsProductionQuery.data}
            />
            <Divider my={4} borderColor="gray.600" />
            <TagConfigForm
              questionSets={questionSets}
              setConfig={setConfig}
              config={config}
            />
            <QuestionTypeConfigForm
              questionSets={questionSets}
              setConfig={setConfig}
              config={config}
            />
            <Heading size="sm" color={accent} mt={6} mb={2}>
              Current Configs
            </Heading>
            <Text color="gray.300" mb={2}>
              These are the current configs which the algorithm will select
              random questions from:
            </Text>
            <ConfigView {...{ config, setConfig }} />

            <Divider my={4} borderColor="gray.600" />
            <Heading size="md" color={accent} mt={8} mb={2} id="exam-questions">
              Exam Questions
            </Heading>
            <Text color="gray.300" mb={2}>
              You can create new questions here. Your questions are not saved to
              the database until you click the "Save to Database" button.
            </Text>
            <Box bg="gray.700" borderRadius="lg" p={4} mt={2}>
              <QuestionForm
                searchIds={searchIds}
                questionSets={questionSets}
                setQuestionSets={setQuestionSets}
                generatedExamsStagingQuery={generatedExamsStagingQuery}
                generatedExamsProductionQuery={generatedExamsProductionQuery}
              />
            </Box>
          </form>
        </Box>
      </Stack>
    </>
  );
}

export const editExamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exams/$id",
  component: () => (
    <ProtectedRoute>
      <Edit />
    </ProtectedRoute>
  ),
});
