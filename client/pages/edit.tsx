import { useState, useContext, useReducer, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  SimpleGrid,
  Badge,
  Divider,
  Input,
  NumberInput,
  NumberInputField,
  FormLabel,
  FormControl,
  IconButton,
  Spinner,
  Checkbox,
} from "@chakra-ui/react";
import { ObjectId } from "bson";
import { Save } from "lucide-react";
import type { EnvExam } from "@prisma/client";

import { rootRoute } from "./root";
import { QuestionForm } from "../components/question-form";
import { getExamById, putExamById } from "../utils/fetch";
import { TagConfigForm } from "../components/tag-config-form";
import { ProtectedRoute } from "../components/protected-route";
import { QuestionSearch } from "../components/question-search";
import { QuestionTypeConfigForm } from "../components/question-type-config-form";
import { landingRoute } from "./landing";
import { UsersWebSocketContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";

export function Edit() {
  const { id } = useParams({ from: "/exam/$id" });
  const { user, logout } = useContext(AuthContext)!;

  const navigate = useNavigate();

  const examQuery = useQuery({
    queryKey: ["exam", id],
    enabled: !!user,
    queryFn: () => getExamById(id!),
    retry: false,
    // TODO: This does not work, because it overwrites the current edit before a save
    //       Somehow, the client must always PUT before GET
    //       Potentially, a PATCH request must be used with only the changed data to prevent unwanted overwrites
    // refetchInterval: 5000,
  });

  const bg = useColorModeValue("gray.900", "gray.900");
  const spinnerColor = useColorModeValue("teal.400", "teal.300");

  return (
    <Box minH="100vh" bg={bg} py={8} px={2} position="relative">
      {/* Back to Dashboard and Logout buttons */}
      <HStack position="fixed" top={6} left={8} zIndex={101} spacing={3}>
        <Button
          colorScheme="teal"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: landingRoute.to })}
        >
          Back to Dashboard
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
      <UsersEditing id={id} />
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

function UsersEditing({ id }: { id: string }) {
  const { users, error: usersError } = useContext(UsersWebSocketContext)!;

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
          users
            .filter((u) => u.activity?.exam === id)
            .map((user, idx) => (
              <Tooltip label={user.name} key={user.email}>
                <Avatar
                  src={user.picture}
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

function examReducer(state: EnvExam, action: Partial<EnvExam>) {
  const newState = { ...state, ...action };
  return newState;
}

function EditExam({ exam: examData }: { exam: EnvExam }) {
  const { updateActivity } = useContext(UsersWebSocketContext)!;
  const [exam, setExam] = useReducer(examReducer, examData);
  const [searchIds, setSearchIds] = useState<string[]>([]);
  const [prereqInput, setPrereqInput] = useState("");

  const putExamMutation = useMutation({
    mutationFn: (exam: EnvExam) => {
      return putExamById(exam);
    },
    onSuccess(data, _variables, _context) {
      console.log(data);
      setExam(data);
    },
  });

  useEffect(() => {
    updateActivity(exam.id);

    return () => {
      updateActivity(null);
    };
  }, [exam]);

  // const discardExamStateMutation = useMutation({
  //   mutationFn: (examId: EnvExam["id"]) => {
  //     return discardExamStateById(accessToken!, examId);
  //   },
  //   onSuccess(data, _variables, _context) {
  //     setExam(data);
  //   },
  // });

  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  return (
    <>
      <Box
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
      >
        <Button
          leftIcon={<Save size={18} />}
          colorScheme="teal"
          variant="solid"
          px={4}
          fontWeight="bold"
          isLoading={putExamMutation.isPending}
          onClick={() => putExamMutation.mutate(exam)}
        >
          Save to Database
        </Button>
        {/* <Button
          leftIcon={<Save size={18} />}
          colorScheme="teal"
          variant="solid"
          px={4}
          fontWeight="bold"
          isLoading={discardExamStateMutation.isPending}
          onClick={() => discardExamStateMutation.mutate(exam.id)}
        >
          Discard Changes
        </Button> */}
      </Box>
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
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={4}>
              <FormControl>
                <FormLabel color="gray.300">Exam Name</FormLabel>
                <Input
                  type="text"
                  placeholder="Exam Name..."
                  value={exam.config.name}
                  onChange={(e) =>
                    setExam({
                      config: {
                        ...exam.config,
                        name: e.target.value,
                      },
                    })
                  }
                  bg="gray.700"
                  color="gray.100"
                />
              </FormControl>
              <FormControl>
                <FormLabel color="gray.300">Accessibility Note</FormLabel>
                <Input
                  type="text"
                  placeholder="Accessibility Note..."
                  value={exam.config.note}
                  onChange={(e) =>
                    setExam({
                      config: {
                        ...exam.config,
                        note: e.target.value,
                      },
                    })
                  }
                  bg="gray.700"
                  color="gray.100"
                />
              </FormControl>
              <FormControl>
                <FormLabel color="gray.300">Total Time [ms]</FormLabel>
                <NumberInput
                  value={exam.config.totalTimeInMS}
                  onChange={(_, value) =>
                    setExam({
                      config: {
                        ...exam.config,
                        totalTimeInMS: value,
                      },
                    })
                  }
                  min={0}
                >
                  <NumberInputField bg="gray.700" color="gray.100" />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel color="gray.300">
                  Retake (Cooldown) Time [ms]
                </FormLabel>
                <NumberInput
                  value={exam.config.retakeTimeInMS}
                  onChange={(_, value) =>
                    setExam({
                      config: {
                        ...exam.config,
                        retakeTimeInMS: value,
                      },
                    })
                  }
                  min={0}
                >
                  <NumberInputField bg="gray.700" color="gray.100" />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.300">Prerequisites</FormLabel>
                <Input
                  type="text"
                  placeholder="Add ObjectID and press Enter"
                  bg="gray.700"
                  color="gray.100"
                  value={prereqInput || ""}
                  onChange={(e) => setPrereqInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const value = prereqInput?.trim();
                      if (
                        value &&
                        ObjectId.isValid(value) &&
                        !exam.prerequisites.includes(value)
                      ) {
                        setExam({
                          prerequisites: [...exam.prerequisites, value],
                        });
                        setPrereqInput("");
                      }
                    }
                  }}
                  mb={2}
                />
                <Box
                  bg="gray.700"
                  borderRadius="md"
                  px={2}
                  py={1}
                  minH="40px"
                  maxH="120px"
                  overflowY="auto"
                  display="flex"
                  flexWrap="wrap"
                  alignItems="flex-start"
                >
                  {exam.prerequisites?.map((id, idx) => (
                    <Badge
                      key={id}
                      colorScheme="teal"
                      variant="solid"
                      mr={2}
                      mb={1}
                      px={2}
                      py={1}
                      borderRadius="md"
                      display="flex"
                      alignItems="center"
                    >
                      <span style={{ marginRight: 6 }}>{id}</span>
                      <IconButton
                        aria-label="Remove prerequisite"
                        icon={<span>✕</span>}
                        size="xs"
                        colorScheme="red"
                        variant="ghost"
                        ml={1}
                        onClick={() => {
                          setExam({
                            prerequisites: exam.prerequisites.filter(
                              (_, i) => i !== idx
                            ),
                          });
                        }}
                      />
                    </Badge>
                  ))}
                </Box>
                <Text color="gray.400" fontSize="xs" mt={1}>
                  Enter a 24-character hex ObjectID and press Enter to add.
                  Click ✕ to remove.
                </Text>
              </FormControl>
              <FormControl>
                <FormLabel color="gray.300">Deprecated</FormLabel>
                <Checkbox
                  isChecked={exam.deprecated}
                  onChange={(e) =>
                    setExam({
                      deprecated: e.target.checked,
                    })
                  }
                  bg="gray.700"
                  color="gray.100"
                  colorScheme="red"
                >
                  Deprecated
                </Checkbox>
              </FormControl>
            </SimpleGrid>
            <Divider my={4} borderColor="gray.600" />
            <Heading size="md" color={accent} mb={2} id="current-configs-main">
              Configure Question Distribution
            </Heading>
            <Text color="gray.300" mb={2}>
              This section allows you to configure how many questions you want
              to add to the exam for a specific topic.
            </Text>
            <TagConfigForm
              questionSets={exam.questionSets}
              setExam={setExam}
              config={exam.config}
            />
            <QuestionTypeConfigForm
              questionSets={exam.questionSets}
              setExam={setExam}
              config={exam.config}
            />
            <Heading size="sm" color={accent} mt={6} mb={2}>
              Current Configs
            </Heading>
            <Text color="gray.300" mb={2}>
              These are the current configs which the algorithm will select
              random questions from:
            </Text>
            {exam.config.tags?.map((tagConfig, index) => (
              <Box key={index} className="tag-config-container" mb={2}>
                <Text fontWeight="bold" color="gray.100">
                  Config {index + 1} ({tagConfig.numberOfQuestions} Questions)
                </Text>
                {tagConfig.group.map((tag, inner) => (
                  <Badge
                    key={inner}
                    colorScheme="teal"
                    variant="subtle"
                    mr={1}
                    mb={1}
                  >
                    {tag}
                  </Badge>
                ))}
                <IconButton
                  aria-label="Remove"
                  icon={<span>✕</span>}
                  size="xs"
                  ml={2}
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => {
                    setExam({
                      config: {
                        ...exam.config,
                        tags: exam.config.tags.filter((_, i) => i !== index),
                      },
                    });
                  }}
                />
              </Box>
            ))}
            <Divider my={4} borderColor="gray.600" />
            {exam.config.questionSets.map((qt, index) => (
              <Box key={index} className="tag-config-container" mb={2}>
                <Text fontWeight="bold" color="gray.100">
                  {qt.type} Questions
                </Text>
                <Text color="gray.300" fontSize="sm">
                  Number of Type: {qt.numberOfSet}
                </Text>
                <Text color="gray.300" fontSize="sm">
                  Number of Questions: {qt.numberOfQuestions}
                </Text>
                <Text color="gray.300" fontSize="sm">
                  Number of Correct Answers: {qt.numberOfCorrectAnswers}
                </Text>
                <Text color="gray.300" fontSize="sm">
                  Number of Incorrect Answers: {qt.numberOfIncorrectAnswers}
                </Text>
                <Button
                  size="xs"
                  colorScheme="red"
                  mt={1}
                  onClick={() =>
                    setExam({
                      config: {
                        ...exam.config,
                        questionSets: exam.config.questionSets.filter(
                          (_, i) => i !== index
                        ),
                      },
                    })
                  }
                >
                  Remove
                </Button>
              </Box>
            ))}
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
                questionSets={exam.questionSets}
                setExam={setExam}
              />
            </Box>
          </form>
        </Box>
      </Stack>
    </>
  );
}

export const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exam/$id",
  component: () => (
    <ProtectedRoute>
      <Edit />
    </ProtectedRoute>
  ),
});
