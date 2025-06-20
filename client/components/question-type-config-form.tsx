import {
  EnvExam,
  type EnvConfig,
  type EnvQuestionSet,
  type EnvQuestionType,
} from "@prisma/client";
import { useState } from "react";
import {
  Box,
  Button,
  HStack,
  Select,
  NumberInput,
  NumberInputField,
  FormControl,
  FormLabel,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";

type QuestionTypeConfigFormProps = {
  questionSets: EnvQuestionSet[];
  setExam: (partialExam: Partial<EnvExam>) => void;
  config: EnvConfig;
};

export function QuestionTypeConfigForm({
  questionSets,
  setExam,
  config,
}: QuestionTypeConfigFormProps) {
  const [selectedQuestionType, setSelectedQuestionType] =
    useState<EnvQuestionType>();
  const [isCreatingQuestionTypeConfig, setIsCreatingQuestionTypeConfig] =
    useState(false);
  const [numberOfSet, setNumberOfSet] = useState(1);
  const [numberOfQuestions, setNumberOfQuestions] = useState(1);
  const [numberOfCorrectAnswers, setNumberOfCorrectAnswers] = useState(1);
  const [numberOfIncorrectAnswers, setNumberOfIncorrectAnswers] = useState(0);

  const cardBg = useColorModeValue("gray.800", "gray.800");

  const options = questionSets.reduce((acc, curr) => {
    if (!acc.includes(curr.type)) {
      return [...acc, curr.type];
    }
    return acc;
  }, [] as EnvQuestionType[]);

  if (!isCreatingQuestionTypeConfig) {
    return (
      <Button
        colorScheme="teal"
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
    <Box bg={cardBg} borderRadius="lg" p={4} mb={4} mt={2}>
      <Stack spacing={3}>
        <FormControl>
          <FormLabel color="gray.300" fontSize="sm" mb={1}>
            Question Type
          </FormLabel>
          <Select
            onChange={(e) =>
              setSelectedQuestionType(e.target.value as EnvQuestionType)
            }
            value={selectedQuestionType ?? ""}
            bg="gray.700"
            color="gray.100"
            maxW="200px"
            size="sm"
          >
            <option value="">Select Question Type</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel color="gray.300" fontSize="sm" mb={1}>
            Number of Type
          </FormLabel>
          <NumberInput
            min={1}
            value={numberOfSet}
            onChange={(_, value) => setNumberOfSet(value)}
            maxW="120px"
            size="sm"
          >
            <NumberInputField bg="gray.700" color="gray.100" />
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel color="gray.300" fontSize="sm" mb={1}>
            Number of Questions
          </FormLabel>
          <NumberInput
            min={1}
            value={numberOfQuestions}
            onChange={(_, value) => setNumberOfQuestions(value)}
            maxW="120px"
            size="sm"
            // Optionally restrict for MultipleChoice
            max={selectedQuestionType === "MultipleChoice" ? 1 : undefined}
          >
            <NumberInputField bg="gray.700" color="gray.100" />
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel color="gray.300" fontSize="sm" mb={1}>
            Number of Correct Answers
          </FormLabel>
          <NumberInput
            min={1}
            value={numberOfCorrectAnswers}
            onChange={(_, value) => setNumberOfCorrectAnswers(value)}
            maxW="120px"
            size="sm"
          >
            <NumberInputField bg="gray.700" color="gray.100" />
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel color="gray.300" fontSize="sm" mb={1}>
            Number of Incorrect Answers
          </FormLabel>
          <NumberInput
            min={0}
            value={numberOfIncorrectAnswers}
            onChange={(_, value) => setNumberOfIncorrectAnswers(value)}
            maxW="120px"
            size="sm"
          >
            <NumberInputField bg="gray.700" color="gray.100" />
          </NumberInput>
        </FormControl>
        <HStack>
          <Button
            onClick={() => setIsCreatingQuestionTypeConfig(false)}
            colorScheme="gray"
            variant="ghost"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            colorScheme="teal"
            size="sm"
            onClick={() => {
              if (!selectedQuestionType) return;
              setExam({
                config: {
                  ...config,
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
                },
              });
              setIsCreatingQuestionTypeConfig(false);
            }}
            isDisabled={!selectedQuestionType}
          >
            Save
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}
