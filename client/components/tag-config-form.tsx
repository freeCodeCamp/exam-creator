import type {
  ExamEnvironmentConfig,
  ExamEnvironmentQuestionSet,
} from "@prisma/client";
import { useState } from "react";
import {
  Box,
  Button,
  HStack,
  Badge,
  Select,
  NumberInput,
  NumberInputField,
  FormControl,
  FormLabel,
  Stack,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { X } from "lucide-react";

type TagConfigFormProps = {
  questionSets: ExamEnvironmentQuestionSet[];
  setConfig: (partialConfig: Partial<ExamEnvironmentConfig>) => void;
  config: ExamEnvironmentConfig;
};

export function TagConfigForm({
  questionSets,
  setConfig,
  config,
}: TagConfigFormProps) {
  const [isCreatingTagConfig, setIsCreatingTagConfig] = useState(false);
  const [selectedQuestionAmount, setSelectedQuestionAmount] = useState(1);
  const [currentTagSelectValue, setCurrentTagSelectValue] = useState("0");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const cardBg = useColorModeValue("gray.800", "gray.800");

  if (!isCreatingTagConfig) {
    return (
      <Button
        colorScheme="teal"
        variant="outline"
        size="sm"
        mt={2}
        onClick={() => setIsCreatingTagConfig(true)}
      >
        Create Tag Config
      </Button>
    );
  }

  function generateTagOptions() {
    const tags = questionSets
      .map((q) => q.questions.map((q) => q.tags))
      .flat(2);

    const tagSet = new Set(tags);

    return Array.from(tagSet).map((tag) => (
      <option key={tag} value={tag}>
        {tag}
      </option>
    ));
  }

  const resetTagConfig = () => {
    setIsCreatingTagConfig(false);
    setCurrentTagSelectValue("0");
    setSelectedQuestionAmount(1);
    setSelectedTags([]);
  };

  const addSelectedTag = () => {
    const isAlreadySelected = selectedTags.includes(currentTagSelectValue);

    if (!isAlreadySelected && currentTagSelectValue !== "0") {
      setSelectedTags([...selectedTags, currentTagSelectValue]);
    }
  };

  const removeSelectedTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((selectedTag) => selectedTag !== tag));
  };

  return (
    <Box bg={cardBg} borderRadius="lg" p={4} mb={4} mt={2}>
      <Stack spacing={3}>
        <HStack spacing={2} wrap="wrap">
          {selectedTags.map((tag, index) => (
            <Badge
              key={index}
              colorScheme="teal"
              variant="solid"
              px={2}
              py={1}
              borderRadius="md"
              display="flex"
              alignItems="center"
            >
              {tag}
              <IconButton
                aria-label="Remove tag"
                icon={<X size={14} />}
                size="xs"
                ml={1}
                variant="ghost"
                colorScheme="red"
                onClick={() => removeSelectedTag(tag)}
              />
            </Badge>
          ))}
        </HStack>
        <HStack>
          <Select
            value={currentTagSelectValue}
            onChange={(e) => setCurrentTagSelectValue(e.target.value)}
            bg="gray.700"
            color="gray.100"
            maxW="200px"
            size="sm"
          >
            <option value="0">Select Tag</option>
            {generateTagOptions()}
          </Select>
          <Button
            colorScheme="teal"
            size="sm"
            onClick={addSelectedTag}
            isDisabled={currentTagSelectValue === "0"}
          >
            Add Tag
          </Button>
        </HStack>
        <FormControl>
          <FormLabel color="gray.300" fontSize="sm" mb={1}>
            Number of Questions
          </FormLabel>
          <NumberInput
            min={1}
            value={selectedQuestionAmount}
            onChange={(_, value) => setSelectedQuestionAmount(value)}
            maxW="120px"
            size="sm"
          >
            <NumberInputField bg="gray.700" color="gray.100" />
          </NumberInput>
        </FormControl>
        <HStack>
          <Button
            onClick={resetTagConfig}
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
              setConfig({
                tags: [
                  ...config.tags,
                  {
                    group: selectedTags,
                    numberOfQuestions: selectedQuestionAmount,
                  },
                ],
              });
              resetTagConfig();
            }}
            isDisabled={selectedTags.length === 0}
          >
            Save
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}
