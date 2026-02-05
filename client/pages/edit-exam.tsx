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
  HStack,
  Separator,
  Spinner,
  Table,
  Flex,
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
import { UsersWebSocketActivityContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { examsRoute } from "./exams";
import { EditExamGenerationVariability } from "../components/edit-exam-generation-variability";
import { EditExamConfig } from "../components/edit-exam-config";
import { ConfigView } from "../components/config-view";
import { UsersOnPageAvatars } from "../components/users-on-page-avatars";

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

  return (
    <Box minH="100vh" bg={"bg"} py={8} px={2} position="relative">
      {/* Back to Dashboard and Logout buttons */}
      <HStack position="fixed" top={3} left={8} zIndex={101} gap={3}>
        <Button
          colorPalette="teal"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: examsRoute.to })}
        >
          Back to Exams
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
        {examQuery.isPending ? (
          <Spinner color={"fg.info"} size="xl" />
        ) : examQuery.isError ? (
          <Text color="fg.error" fontSize="lg">
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
  return (
    <Box
      position="fixed"
      top={4}
      right="16rem"
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

function examReducer(state: ExamCreatorExam, action: Partial<ExamCreatorExam>) {
  const newState = { ...state, ...action };
  return newState;
}

function configReducer(
  state: ExamEnvironmentConfig,
  action: Partial<ExamEnvironmentConfig>,
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
    queryKey: ["exam-challenges", exam.id],
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

  // { [type]: { numberOfSet: number, numberOfQuestions: number } }
  const questionsBySet = questionSets.reduce(
    (acc, qs) => {
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
    },
    {} as { [key: string]: { numberOfSet: number; numberOfQuestions: number } },
  );

  return (
    <>
      <EditExamActions
        {...{
          exam,
          config,
          questionSets,
          examEnvironmentChallenges,
        }}
      />
      <Stack gap={8} w="full" maxW="7xl">
        <Box
          bg={"gray.contrast"}
          borderRadius="xl"
          boxShadow="lg"
          p={8}
          mb={4}
          w="full"
        >
          <Flex direction="row">
            <Heading fontWeight="extrabold" fontSize="2xl" mb={2}>
              Edit Exam
            </Heading>
            <Box marginLeft={2}>
              <QuestionSearch
                exam={exam}
                setSearchIds={setSearchIds}
                searchIds={searchIds}
              />
            </Box>
          </Flex>
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
            <Separator my={4} />
            <Heading size="md" mb={2} id="current-configs-main">
              Configure Question Distribution
            </Heading>

            <Text mb={2}>
              This section allows you to configure how many questions you want
              to add to the exam for a specific topic.
            </Text>

            <Box mb={4}>
              <Box overflowX="auto" borderRadius="md" p={2}>
                <Table.Root variant="outline" size="sm" colorPalette="teal">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader color="teal.300">
                        Set Type
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>Number of Set</Table.ColumnHeader>
                      <Table.ColumnHeader>
                        Number of Questions (total)
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {Object.entries(questionsBySet).map(([type, data]) => (
                      <Table.Row key={type}>
                        <Table.Cell fontWeight="bold">{type}</Table.Cell>
                        <Table.Cell>{data.numberOfSet}</Table.Cell>
                        <Table.Cell>{data.numberOfQuestions}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>
            <EditExamGenerationVariability
              examId={exam.id}
              generatedExamsStagingData={generatedExamsStagingQuery.data}
              generatedExamsProductionData={generatedExamsProductionQuery.data}
            />
            <Separator my={4} />
            <HStack justifyContent={"space-evenly"} alignItems={"start"}>
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
            </HStack>
            <Heading size="sm" mt={6} mb={2}>
              Current Configs
            </Heading>
            <Text mb={2}>
              These are the current configs which the algorithm will select
              random questions from:
            </Text>
            <ConfigView {...{ config, setConfig }} />

            <Separator my={4} />
            <Heading size="md" mt={8} mb={2} id="exam-questions">
              Exam Questions
            </Heading>
            <Text mb={2}>
              You can create new questions here. Your questions are not saved to
              the database until you click the "Save to Database" button.
            </Text>
            <Box borderRadius="lg" p={4} mt={2}>
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
