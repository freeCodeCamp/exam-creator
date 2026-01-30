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
  NativeSelect,
  NumberInput,
  Field,
  Stack,
  IconButton,
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

  if (!isCreatingTagConfig) {
    return (
      <Button
        colorPalette="teal"
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
    <Box
      borderColor="border.info"
      borderWidth={1}
      borderRadius="lg"
      p={4}
      mb={4}
      mt={2}
    >
      <Stack gap={3}>
        <HStack gap={2} wrap="wrap">
          {selectedTags.map((tag, index) => (
            <Badge
              key={index}
              colorPalette="teal"
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
                size="xs"
                ml={1}
                variant="ghost"
                colorPalette="red"
                onClick={() => removeSelectedTag(tag)}
              >
                <X size={14} />
              </IconButton>
            </Badge>
          ))}
        </HStack>
        <HStack>
          <NativeSelect.Root maxW="200px" size="sm">
            <NativeSelect.Field
              value={currentTagSelectValue}
              onChange={(e) => setCurrentTagSelectValue(e.target.value)}
            >
              <option value="0">Select Tag</option>
              {generateTagOptions()}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Button
            colorPalette="teal"
            size="sm"
            onClick={addSelectedTag}
            disabled={currentTagSelectValue === "0"}
          >
            Add Tag
          </Button>
        </HStack>
        <Field.Root>
          <Field.Label fontSize="sm" mb={1}>
            Number of Questions
          </Field.Label>
          <NumberInput.Root
            min={1}
            value={selectedQuestionAmount.toString()}
            onValueChange={(d) => setSelectedQuestionAmount(d.valueAsNumber)}
            maxW="120px"
            size="sm"
          >
            <NumberInput.Control />
            <NumberInput.Input />
          </NumberInput.Root>
        </Field.Root>
        <HStack>
          <Button
            onClick={resetTagConfig}
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
            disabled={selectedTags.length === 0}
          >
            Save
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}
