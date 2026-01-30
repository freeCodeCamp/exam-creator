import { Card, Badge, Text, Button, Flex } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import type { ExamCreatorExam } from "@prisma/client";
import { viewMetricsRoute } from "../pages/view-metrics";

interface ExamCardProps {
  exam: Omit<ExamCreatorExam, "questionSets">;
  numberOfAttempts: number;
}

export function ExamMetricsCard({ exam, numberOfAttempts }: ExamCardProps) {
  const navigate = useNavigate();
  const cardBg = "gray.800";
  const accent = "teal.300";

  const handleClick = () => {
    navigate({ to: viewMetricsRoute.to, params: { id: exam.id } });
  };

  return (
    <Button
      variant="plain"
      w="full"
      h="auto"
      p={0}
      onClick={handleClick}
      _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
      borderRadius="xl"
      transition="all 0.15s"
      display="block"
      textAlign="left"
    >
      <Card.Root
        bg={cardBg}
        borderRadius="xl"
        boxShadow="md"
        p={3}
        h="100%"
        minH="120px"
        _hover={{ borderColor: accent, boxShadow: "lg" }}
        borderWidth={2}
        borderColor={"transparent"}
        transition="all 0.15s"
      >
        <Card.Header pb={2} padding={1}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3} flex="1 1 0%" minW={0}>
              <Text
                fontSize="xl"
                fontWeight="bold"
                color={accent}
                lineClamp={1}
                flex={1}
                minW={0}
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
              >
                {exam.config.name}
              </Text>
            </Flex>
            {exam.deprecated && (
              <Badge
                colorPalette="red"
                ml={2}
                flexShrink={0}
                minW="90px"
                textAlign="center"
              >
                Deprecated
              </Badge>
            )}
          </Flex>
        </Card.Header>
        <Card.Body pt={2} padding={1}>
          <Text color="gray.300" fontSize="md">
            Number of Attempts: {numberOfAttempts}
          </Text>
        </Card.Body>
        <Card.Footer padding="0" justifyContent={"space-evenly"}></Card.Footer>
      </Card.Root>
    </Button>
  );
}
