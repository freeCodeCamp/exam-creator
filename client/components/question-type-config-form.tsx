import {
  type ExamEnvironmentConfig,
  type ExamEnvironmentQuestionSet,
  type ExamEnvironmentQuestionType,
} from "@prisma/client";
import { useState } from "react";
import {
  Box,
  Button,
  HStack,
  NativeSelect,
  NumberInput,
  Field,
  Stack,
} from "@chakra-ui/react";

type QuestionTypeConfigFormProps = {
  questionSets: ExamEnvironmentQuestionSet[];
  setConfig: (partialConfig: Partial<ExamEnvironmentConfig>) => void;
  config: ExamEnvironmentConfig;
};

export function QuestionTypeConfigForm({
  questionSets,
  setConfig,
  config,
}: QuestionTypeConfigFormProps) {
  const [selectedQuestionType, setSelectedQuestionType] =
    useState<ExamEnvironmentQuestionType>();
  const [isCreatingQuestionTypeConfig, setIsCreatingQuestionTypeConfig] =
    useState(false);
  const [numberOfSet, setNumberOfSet] = useState(1);
  const [numberOfQuestions, setNumberOfQuestions] = useState(1);
  const [numberOfCorrectAnswers, setNumberOfCorrectAnswers] = useState(1);
  const [numberOfIncorrectAnswers, setNumberOfIncorrectAnswers] = useState(0);

  const options = questionSets.reduce((acc, curr) => {
    if (!acc.includes(curr.type)) {
      return [...acc, curr.type];
    }
    return acc;
  }, [] as ExamEnvironmentQuestionType[]);

  if (!isCreatingQuestionTypeConfig) {
    return (
      <Button
        colorPalette="teal"
        variant="outline"
        size="sm"
        mt={2}
        onClick={() => setIsCreatingQuestionTypeConfig(true)}
      >
        Create Question Type Config
      </Button>
    );
  }

  return (
    <Box
      borderColor="border.info"
      borderWidth={1}
      borderRadius="lg"
      p={4}
      mb={4}
      mt={2}
    >
      <Stack gap={3}>
        <Field.Root>
          <Field.Label fontSize="sm" mb={1}>
            Question Type
          </Field.Label>
          <NativeSelect.Root maxW="200px" size="sm">
            <NativeSelect.Field
              value={selectedQuestionType ?? ""}
              onChange={(e) =>
                setSelectedQuestionType(
                  e.target.value as ExamEnvironmentQuestionType,
                )
              }
            >
              <option value="">Select Question Type</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
        <Field.Root>
          <Field.Label fontSize="sm" mb={1}>
            Number of Type
          </Field.Label>
          <NumberInput.Root
            min={1}
            value={numberOfSet.toString()}
            onValueChange={(d) => setNumberOfSet(d.valueAsNumber)}
            maxW="120px"
            size="sm"
          >
            <NumberInput.Control color="gray.100" />
            <NumberInput.Input />
          </NumberInput.Root>
        </Field.Root>
        <Field.Root>
          <Field.Label fontSize="sm" mb={1}>
            Number of Questions
          </Field.Label>
          <NumberInput.Root
            min={1}
            value={numberOfQuestions.toString()}
            onValueChange={(d) => setNumberOfQuestions(d.valueAsNumber)}
            maxW="120px"
            size="sm"
            // Optionally restrict for MultipleChoice
            max={selectedQuestionType === "MultipleChoice" ? 1 : undefined}
          >
            <NumberInput.Control />
            <NumberInput.Input />
          </NumberInput.Root>
        </Field.Root>
        <Field.Root>
          <Field.Label fontSize="sm" mb={1}>
            Number of Correct Answers
          </Field.Label>
          <NumberInput.Root
            min={1}
            value={numberOfCorrectAnswers.toString()}
            onValueChange={(d) => setNumberOfCorrectAnswers(d.valueAsNumber)}
            maxW="120px"
            size="sm"
          >
            <NumberInput.Control />
            <NumberInput.Input />
          </NumberInput.Root>
        </Field.Root>
        <Field.Root>
          <Field.Label fontSize="sm" mb={1}>
            Number of Incorrect Answers
          </Field.Label>
          <NumberInput.Root
            min={0}
            value={numberOfIncorrectAnswers.toString()}
            onValueChange={(d) => setNumberOfIncorrectAnswers(d.valueAsNumber)}
            maxW="120px"
            size="sm"
          >
            <NumberInput.Control />
            <NumberInput.Input />
          </NumberInput.Root>
        </Field.Root>
        <HStack>
          <Button
            onClick={() => setIsCreatingQuestionTypeConfig(false)}
            colorPalette="gray"
            variant="ghost"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            colorPalette="teal"
            size="sm"
            onClick={() => {
              if (!selectedQuestionType) return;
              setConfig({
                questionSets: [
                  ...config.questionSets,
                  {
                    type: selectedQuestionType,
                    numberOfSet,
                    numberOfQuestions,
                    numberOfCorrectAnswers,
                    numberOfIncorrectAnswers,
                  },
                ],
              });
              setIsCreatingQuestionTypeConfig(false);
            }}
            disabled={!selectedQuestionType}
          >
            Save
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}
