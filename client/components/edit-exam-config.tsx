import { type Dispatch, type SetStateAction, useState } from "react";
import {
  Box,
  Badge,
  SimpleGrid,
  Field,
  Input,
  NumberInput,
  IconButton,
  Spinner,
  Checkbox,
  Text,
  Textarea,
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

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} mb={4}>
      <Field.Root>
        <Field.Label>Exam Name</Field.Label>
        <Input
          type="text"
          placeholder="Exam Name..."
          value={config.name}
          onChange={(e) =>
            setConfig({
              name: e.target.value,
            })
          }
        />
      </Field.Root>
      <Field.Root>
        <Field.Label>Accessibility Note</Field.Label>
        <Textarea
          placeholder="Accessibility Note..."
          value={config.note ?? ""}
          onChange={(e) =>
            setConfig({
              note: e.target.value,
            })
          }
        />
      </Field.Root>
      <Field.Root>
        <Field.Label>Total Time [s]</Field.Label>
        <NumberInput.Root
          value={config.totalTimeInS.toString()}
          onValueChange={(v) =>
            setConfig({
              totalTimeInS: Number(v.value),
            })
          }
          min={0}
        >
          <NumberInput.Input />
        </NumberInput.Root>
      </Field.Root>
      <Field.Root>
        <Field.Label>Retake (Cooldown) Time [s]</Field.Label>
        <NumberInput.Root
          value={config.retakeTimeInS.toString()}
          onValueChange={(v) =>
            setConfig({
              retakeTimeInS: Number(v.value),
            })
          }
          min={0}
        >
          <NumberInput.Input />
        </NumberInput.Root>
      </Field.Root>

      <Field.Root>
        <Field.Label>Prerequisites</Field.Label>
        <Input
          type="text"
          placeholder="Add ObjectID and press Enter"
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
          mb={1}
        />
        <Box
          bg="bg.emphasized"
          borderRadius="md"
          px={2}
          py={1}
          minH="40px"
          maxH="120px"
          overflowY="auto"
          display="flex"
          flexWrap="wrap"
          alignItems="flex-start"
          width="100%"
        >
          {exam.prerequisites?.map((id, idx) => (
            <Badge
              key={id}
              colorPalette="teal"
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
                size="xs"
                colorPalette="red"
                variant="ghost"
                ml={1}
                onClick={() => {
                  setExam({
                    prerequisites: exam.prerequisites.filter(
                      (_, i) => i !== idx,
                    ),
                  });
                }}
              >
                <span>✕</span>
              </IconButton>
            </Badge>
          ))}
        </Box>
        <Text color="fg.muted" fontSize="xs" mt={1}>
          Enter a 24-character hex ObjectID and press Enter to add. Click ✕ to
          remove.
        </Text>
      </Field.Root>

      <Field.Root>
        <Field.Label>Related Challenge IDs</Field.Label>
        {examEnvironmentChallengesQuery.isError && (
          <Field.ErrorText>
            Error loading challenges:{" "}
            {examEnvironmentChallengesQuery.error.message}
          </Field.ErrorText>
        )}
        <Input
          type="text"
          placeholder="Add ObjectID and press Enter"
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
                  (ch) => ch.challengeId === value,
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
          mb={1}
        />
        <Box
          bg="bg.emphasized"
          borderRadius="md"
          px={2}
          py={2}
          minH="40px"
          maxH="120px"
          overflowY="auto"
          display="flex"
          flexWrap="wrap"
          alignItems="flex-start"
          width="100%"
        >
          {examEnvironmentChallengesQuery.isPending ? (
            <Spinner color={"fg.info"} size="md" />
          ) : (
            examEnvironmentChallenges.map(({ challengeId }, idx) => (
              <Badge
                key={challengeId}
                colorPalette="teal"
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
                  size="xs"
                  colorPalette="red"
                  variant="ghost"
                  ml={1}
                  onClick={() => {
                    setExamEnvironmentChallenges((prev) =>
                      prev.filter((_, i) => i !== idx),
                    );
                  }}
                >
                  <span>✕</span>
                </IconButton>
              </Badge>
            ))
          )}
        </Box>
        <Text color="fg.muted" fontSize="xs" mt={1}>
          Enter a 24-character hex ObjectID and press Enter to add. Click ✕ to
          remove.
        </Text>
      </Field.Root>
      <Field.Root>
        <Field.Label>Deprecated</Field.Label>
        <Checkbox.Root
          checked={exam.deprecated}
          onCheckedChange={(v) =>
            setExam({
              deprecated: !!v.checked,
            })
          }
          colorPalette="red"
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control mt={1} />

          <Checkbox.Label>Deprecated</Checkbox.Label>
        </Checkbox.Root>
      </Field.Root>

      <Field.Root>
        <Field.Label>Passing Percent [%]</Field.Label>
        <NumberInput.Root
          value={config.passingPercent.toString()}
          onValueChange={(v) =>
            setConfig({
              passingPercent: Number(v.value),
            })
          }
          min={0}
          max={100}
        >
          <NumberInput.Control />
          <NumberInput.Input />
        </NumberInput.Root>
      </Field.Root>
    </SimpleGrid>
  );
}
