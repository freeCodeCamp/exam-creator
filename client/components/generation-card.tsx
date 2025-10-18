import {
  Card,
  CardBody,
  CardHeader,
  HStack,
  Avatar,
  Tooltip,
  Badge,
  Text,
  useColorModeValue,
  Button,
  Flex,
  Checkbox,
  CardFooter,
  Box,
} from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { editExamRoute } from "../pages/edit-exam";
import type {
  ExamCreatorExam,
  ExamEnvironmentGeneratedExam,
} from "@prisma/client";
import { useContext } from "react";
import { UsersWebSocketUsersContext } from "../contexts/users-websocket";

interface GenerationCardProps {
  generatedExam: ExamEnvironmentGeneratedExam;
  databaseEnvironments: ("Staging" | "Production")[];
}

// Exam Name
// How many generations are on staging
// How many generations are on production
// deprecated? show if exam is deprecated?
// Variability ()
// - Do any sets/questions/answers not appear in the generations
// - Do any ____ appear a lot
// Bigger variability is from questions as a whole - answers do little in the way of variability
// - Ignore answers
// 2: Number of different questions / total number of questions
// - Set variability threshold: if not enough variability, discard variability
// same question (same answers) score+=0
// diff question score+=1, answer diff score+=(num diff answer / total answers)
// Total variability = lowest between comparisons
// maybe qs+=3, q+=2, a+=1
//
// Options:
// - Generations page same as exams page
// - Exams page shows generations summary
// - Exam page shows generations summary
// - Generation page with detailed generation info

export function GenerationCard({
  generatedExam,
  databaseEnvironments,
}: GenerationCardProps) {
  const navigate = useNavigate();
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  return (
    <Box
      w="full"
      h="auto"
      p={0}
      _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
      borderRadius="xl"
      transition="all 0.15s"
      display="block"
      textAlign="left"
    >
      <Card
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
        <CardHeader pb={2} padding={1}>
          <Flex align="center" justify="space-between">
            <Text
              fontSize="xl"
              fontWeight="bold"
              color={accent}
              noOfLines={1}
              flex={1}
              minW={0}
              textOverflow="ellipsis"
              overflow="hidden"
              whiteSpace="nowrap"
            >
              Exam Name
            </Text>
            {generatedExam.deprecated && (
              <Badge
                colorScheme="red"
                ml={2}
                flexShrink={0}
                minW="90px"
                textAlign="center"
              >
                Deprecated
              </Badge>
            )}
          </Flex>
        </CardHeader>
        <CardBody pt={2} padding={1}>
          {/* TODO */}
        </CardBody>
        <CardFooter padding="0" justifyContent={"space-evenly"}>
          {databaseEnvironments.map((env) => (
            <Tooltip
              label={`This exam is generated in the ${env} database`}
              key={env}
            >
              <Badge
                key={env}
                colorScheme={env === "Production" ? "green" : "blue"}
                flexShrink={0}
                minW="90px"
                textAlign="center"
              >
                {env}
              </Badge>
            </Tooltip>
          ))}
        </CardFooter>
      </Card>
    </Box>
  );
}
