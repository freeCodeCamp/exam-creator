import {
  Box,
  Heading,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import { ExamCreatorExam } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { getGenerations } from "../utils/fetch";
import { compare } from "../utils/question";

interface EditExamGenerationVariabilityProps {
  exam: ExamCreatorExam;
}

export function EditExamGenerationVariability({
  exam,
}: EditExamGenerationVariabilityProps) {
  const accent = useColorModeValue("teal.400", "teal.300");
  const generatedExamsStagingQuery = useQuery({
    queryKey: ["generated-exams", exam.id, "Staging"],
    queryFn: async () =>
      getGenerations({ examId: exam.id, databaseEnvironment: "Staging" }),
  });
  const generatedExamsProductionQuery = useQuery({
    queryKey: ["generated-exams", exam.id, "Production"],
    queryFn: async () =>
      getGenerations({ examId: exam.id, databaseEnvironment: "Production" }),
  });

  if (
    generatedExamsStagingQuery.isPending ||
    generatedExamsProductionQuery.isPending
  ) {
    return (
      <>
        <Heading size="sm" color={accent} mt={6} mb={2}>
          Exam Generations
        </Heading>
        <Text color="gray.300" mb={2}>
          This is the analysis of the exam generations:
        </Text>
        <Spinner size="sm" color="teal.400" />
      </>
    );
  }
  if (
    generatedExamsStagingQuery.isError ||
    generatedExamsProductionQuery.isError
  ) {
    console.error(generatedExamsStagingQuery.error);
    console.error(generatedExamsProductionQuery.error);
    return (
      <>
        <Heading size="sm" color={accent} mt={6} mb={2}>
          Exam Generations
        </Heading>
        <Text color="gray.300" mb={2}>
          This is the analysis of the exam generations:
        </Text>
        <Text color="red.400" fontWeight="bold">
          Error loading exam generations. See browser console for details.
        </Text>
      </>
    );
  }

  const generatedExamsStaging = generatedExamsStagingQuery.data;
  const generatedExamsProduction = generatedExamsProductionQuery.data;

  const totalGenerationsStaging = generatedExamsStaging.length;
  const totalGenerationsProduction = generatedExamsProduction.length;

  // Variability is considered: (number of different) / (total)
  // For final variability, it is: (sum of variabilities) / (number of comparisons)

  // Compare all generations to each other to find variability
  // - Compare A to B, A to C, and B to C
  const questionsStaging = generatedExamsStaging.map((gen) =>
    gen.questionSets.flatMap((qs) => qs.questions)
  );
  const questionVariabilitiesStaging: number[] = compare(
    questionsStaging,
    (a, b) => {
      const uniqueQuestions = new Set([...a, ...b].map((q) => q.id));
      const v = (uniqueQuestions.size - a.length) / a.length;
      return v;
    }
  );
  const questionVariabilityStaging =
    questionVariabilitiesStaging.reduce((acc, curr) => acc + curr, 0) /
    questionVariabilitiesStaging.length;

  const questionsProduction = generatedExamsProduction.map((gen) =>
    gen.questionSets.flatMap((qs) => qs.questions)
  );
  const questionVariabilitiesProduction: number[] = compare(
    questionsProduction,
    (a, b) => {
      const uniqueQuestions = new Set([...a, ...b].map((q) => q.id));
      const v = (uniqueQuestions.size - a.length) / a.length;
      return v;
    }
  );
  const questionVariabilityProduction =
    questionVariabilitiesProduction.reduce((acc, curr) => acc + curr, 0) /
    questionVariabilitiesProduction.length;

  const questionVariabilityMaxStaging = Math.max(
    ...questionVariabilitiesStaging
  );
  const questionVariabilityMaxProduction = Math.max(
    ...questionVariabilitiesProduction
  );

  const questionVariabilityMinStaging = Math.min(
    ...questionVariabilitiesStaging
  );
  const questionVariabilityMinProduction = Math.min(
    ...questionVariabilitiesProduction
  );

  const answersStaging = generatedExamsStaging.map((gen) =>
    gen.questionSets.flatMap((qs) => qs.questions).flatMap((q) => q.answers)
  );
  const answerVariabilitiesStaging: number[] = compare(
    answersStaging,
    (a, b) => {
      const uniqueAnswers = new Set([...a, ...b].map((ans) => ans));
      const v = (uniqueAnswers.size - a.length) / a.length;
      return v;
    }
  );
  const answerVariabilityStaging =
    answerVariabilitiesStaging.reduce((acc, curr) => acc + curr, 0) /
    answerVariabilitiesStaging.length;

  const answersProduction = generatedExamsProduction.map((gen) =>
    gen.questionSets.flatMap((qs) => qs.questions).flatMap((q) => q.answers)
  );
  const answerVariabilitiesProduction: number[] = compare(
    answersProduction,
    (a, b) => {
      const uniqueAnswers = new Set([...a, ...b].map((ans) => ans));
      const v = (uniqueAnswers.size - a.length) / a.length;
      return v;
    }
  );
  const answerVariabilityProduction =
    answerVariabilitiesProduction.reduce((acc, curr) => acc + curr, 0) /
    answerVariabilitiesProduction.length;

  const answerVariabilityMaxStaging = Math.max(...answerVariabilitiesStaging);
  const answerVariabilityMaxProduction = Math.max(
    ...answerVariabilitiesProduction
  );

  const answerVariabilityMinStaging = Math.min(...answerVariabilitiesStaging);
  const answerVariabilityMinProduction = Math.min(
    ...answerVariabilitiesProduction
  );

  return (
    <>
      <Heading size="sm" color={accent} mt={6} mb={2}>
        Exam Generations
      </Heading>
      <Text color="gray.300" mb={2}>
        This is the analysis of the exam generations:
      </Text>
      {/* TODO */}
      <Box overflowX="auto" borderRadius="md" bg="black" p={2}>
        <Table variant="simple" size="sm" colorScheme="teal">
          <Thead>
            <Tr>
              <Th color="teal.300">Variability</Th>
              <Th color="gray.200">Staging</Th>
              <Th color="gray.200">Production</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="How many generated exams exist">
                  Total Generations
                </Tooltip>
              </Td>
              <Td color="gray.100">{totalGenerationsStaging}</Td>
              <Td color="gray.100">{totalGenerationsProduction}</Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Overall question variability across all generated exams. (sum of variabilities) / (number of comparisons)">
                  Question Total
                </Tooltip>
              </Td>
              <Td color="gray.100">{questionVariabilityStaging.toFixed(3)}</Td>
              <Td color="gray.100">
                {questionVariabilityProduction.toFixed(3)}
              </Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Maximum question variability found between any two generated exams">
                  Question Max
                </Tooltip>
              </Td>
              <Td color="gray.100">
                {questionVariabilityMaxStaging.toFixed(3)}
              </Td>
              <Td color="gray.100">
                {questionVariabilityMaxProduction.toFixed(3)}
              </Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Minimum question variability found between any two generated exams">
                  Question Min
                </Tooltip>
              </Td>
              <Td color="gray.100">
                {questionVariabilityMinStaging.toFixed(3)}
              </Td>
              <Td color="gray.100">
                {questionVariabilityMinProduction.toFixed(3)}
              </Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Overall answer variability across all generated exams. (sum of variabilities) / (number of comparisons)">
                  Answer Total
                </Tooltip>
              </Td>
              <Td color="gray.100">{answerVariabilityStaging.toFixed(3)}</Td>
              <Td color="gray.100">{answerVariabilityProduction.toFixed(3)}</Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Maximum answer variability found between any two generated exams">
                  Answer Max
                </Tooltip>
              </Td>
              <Td color="gray.100">{answerVariabilityMaxStaging.toFixed(3)}</Td>
              <Td color="gray.100">
                {answerVariabilityMaxProduction.toFixed(3)}
              </Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Minimum answer variability found between any two generated exams">
                  Answer Min
                </Tooltip>
              </Td>
              <Td color="gray.100">{answerVariabilityMinStaging.toFixed(3)}</Td>
              <Td color="gray.100">
                {answerVariabilityMinProduction.toFixed(3)}
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    </>
  );
}
