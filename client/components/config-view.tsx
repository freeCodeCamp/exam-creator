import {
  Box,
  Text,
  IconButton,
  Badge,
  Button,
  Accordion,
} from "@chakra-ui/react";
import { ExamEnvironmentConfig } from "@prisma/client";

interface ConfigViewProps {
  config: ExamEnvironmentConfig;
  setConfig: (partialConfig: Partial<ExamEnvironmentConfig>) => void;
}

export function ConfigView({ config, setConfig }: ConfigViewProps) {
  return (
    <>
      <Accordion.Root defaultValue={["0"]} multiple={true}>
        <Accordion.Item value="0">
          <h4>
            <Accordion.ItemTrigger color="teal.300">
              <Box as="span" flex="1" textAlign="left">
                Tag Config
              </Box>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
          </h4>

          <Accordion.ItemContent p={2}>
            {config.tags?.map((tagConfig, index) => (
              <Box key={index} className="tag-config-container" mb={2}>
                <Text fontWeight="bold" color="gray.100">
                  Config {index + 1} ({tagConfig.numberOfQuestions} Questions)
                </Text>
                {tagConfig.group.map((tag, inner) => (
                  <Badge
                    key={inner}
                    colorPalette="teal"
                    variant="subtle"
                    mr={1}
                    mb={1}
                  >
                    {tag}
                  </Badge>
                ))}
                <IconButton
                  aria-label="Remove"
                  size="xs"
                  ml={2}
                  colorPalette="red"
                  variant="ghost"
                  onClick={() => {
                    setConfig({
                      tags: config.tags.filter((_, i) => i !== index),
                    });
                  }}
                >
                  <span>✕</span>
                </IconButton>
              </Box>
            ))}
          </Accordion.ItemContent>
        </Accordion.Item>

        <Accordion.Item value="1">
          <h4>
            <Accordion.ItemTrigger color="teal.300">
              <Box as="span" flex="1" textAlign="left">
                Question Config
              </Box>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
          </h4>

          <Accordion.ItemContent p={2}>
            {config.questionSets.map((qt, index) => (
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
                  colorPalette="red"
                  mt={1}
                  onClick={() =>
                    setConfig({
                      questionSets: config.questionSets.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                >
                  Remove
                </Button>
              </Box>
            ))}
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>
    </>
  );
}
