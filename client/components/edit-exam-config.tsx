import { type Dispatch, type SetStateAction, useState } from "react";
import {
  Box,
  Badge,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  IconButton,
  FormErrorMessage,
  Spinner,
  Checkbox,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  ExamCreatorExam,
  ExamEnvironmentChallenge,
  ExamEnvironmentConfig,
} from "@prisma/client";
import { UseQueryResult } from "@tanstack/react-query";
import { ObjectId } from "bson";

interface EditExamConfigProps {
  exam: ExamCreatorExam;
  setExam: (updates: Partial<ExamCreatorExam>) => void;
  config: ExamEnvironmentConfig;
  setConfig: (updates: Partial<ExamEnvironmentConfig>) => void;
  examEnvironmentChallengesQuery: UseQueryResult<
    ExamEnvironmentChallenge[],
    Error
  >;
  examEnvironmentChallenges: Omit<ExamEnvironmentChallenge, "id">[];
  setExamEnvironmentChallenges: Dispatch<
    SetStateAction<Omit<ExamEnvironmentChallenge, "id">[]>
  >;
}

export function EditExamConfig({
  exam,
  setExam,
  config,
  setConfig,
  examEnvironmentChallengesQuery,
  examEnvironmentChallenges,
  setExamEnvironmentChallenges,
}: EditExamConfigProps) {
  const [prereqInput, setPrereqInput] = useState("");
  const [challengeInput, setChallengeInput] = useState("");

  const accent = useColorModeValue("teal.400", "teal.300");

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={4}>
      <FormControl>
        <FormLabel color="gray.300">Exam Name</FormLabel>
        <Input
          type="text"
          placeholder="Exam Name..."
          value={config.name}
          onChange={(e) =>
            setConfig({
              name: e.target.value,
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
          value={config.note}
          onChange={(e) =>
            setConfig({
              note: e.target.value,
            })
          }
          bg="gray.700"
          color="gray.100"
        />
      </FormControl>
      <FormControl>
        <FormLabel color="gray.300">Total Time [s]</FormLabel>
        <NumberInput
          value={config.totalTimeInS}
          onChange={(_, value) =>
            setConfig({
              totalTimeInS: value,
            })
          }
          min={0}
        >
          <NumberInputField bg="gray.700" color="gray.100" />
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel color="gray.300">Retake (Cooldown) Time [s]</FormLabel>
        <NumberInput
          value={config.retakeTimeInS}
          onChange={(_, value) =>
            setConfig({
              retakeTimeInS: value,
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
          Enter a 24-character hex ObjectID and press Enter to add. Click ✕ to
          remove.
        </Text>
      </FormControl>

      <FormControl>
        <FormLabel color="gray.300">Related Challenge IDs</FormLabel>
        {examEnvironmentChallengesQuery.isError && (
          <FormErrorMessage>
            Error loading challenges:{" "}
            {examEnvironmentChallengesQuery.error.message}
          </FormErrorMessage>
        )}
        <Input
          type="text"
          placeholder="Add ObjectID and press Enter"
          bg="gray.700"
          color="gray.100"
          value={challengeInput || ""}
          disabled={
            examEnvironmentChallengesQuery.isPending ||
            examEnvironmentChallengesQuery.isError
          }
          onChange={(e) => setChallengeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const value = challengeInput?.trim();
              if (
                value &&
                ObjectId.isValid(value) &&
                !examEnvironmentChallenges.some(
                  (ch) => ch.challengeId === value
                )
              ) {
                setExamEnvironmentChallenges((prev) => [
                  ...prev,
                  { examId: exam.id, challengeId: value, version: 1 },
                ]);
                setChallengeInput("");
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
          {examEnvironmentChallengesQuery.isPending ? (
            <Spinner color={accent} size="md" />
          ) : (
            examEnvironmentChallenges.map(({ challengeId }, idx) => (
              <Badge
                key={challengeId}
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
                <span style={{ marginRight: 6 }}>{challengeId}</span>
                <IconButton
                  aria-label="Remove challenge id"
                  icon={<span>✕</span>}
                  size="xs"
                  colorScheme="red"
                  variant="ghost"
                  ml={1}
                  onClick={() => {
                    setExamEnvironmentChallenges((prev) =>
                      prev.filter((_, i) => i !== idx)
                    );
                  }}
                />
              </Badge>
            ))
          )}
        </Box>
        <Text color="gray.400" fontSize="xs" mt={1}>
          Enter a 24-character hex ObjectID and press Enter to add. Click ✕ to
          remove.
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
  );
}
