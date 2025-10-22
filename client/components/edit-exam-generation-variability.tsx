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
import { calculateGenerationMetrics } from "../utils/question";

interface EditExamGenerationVariabilityProps {
  exam: ExamCreatorExam;
}

export function EditExamGenerationVariability({
  exam,
}: EditExamGenerationVariabilityProps) {
  const accent = useColorModeValue("teal.400", "teal.300");
  const stagingMetricsQuery = useQuery({
    queryKey: ["generated-exams", exam.id, "Staging"],
    queryFn: async () => {
      const generatedExams = await getGenerations({
        examId: exam.id,
        databaseEnvironment: "Staging",
      });
      const metrics = calculateGenerationMetrics(generatedExams);
      return metrics;
    },
    retry: false,
  });
  const productionMetricsQuery = useQuery({
    queryKey: ["generated-exams", exam.id, "Production"],
    queryFn: async () => {
      const generatedExams = await getGenerations({
        examId: exam.id,
        databaseEnvironment: "Production",
      });
      const metrics = calculateGenerationMetrics(generatedExams);
      return metrics;
    },
    retry: false,
  });

  if (stagingMetricsQuery.isPending || productionMetricsQuery.isPending) {
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
  if (stagingMetricsQuery.isError || productionMetricsQuery.isError) {
    console.error(stagingMetricsQuery.error);
    console.error(productionMetricsQuery.error);
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

  const stagingMetrics = stagingMetricsQuery.data;
  const productionMetrics = productionMetricsQuery.data;

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
              <Td color="gray.100">{stagingMetrics.totalGenerations}</Td>
              <Td color="gray.100">{productionMetrics.totalGenerations}</Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Overall question variability across all generated exams. (sum of variabilities) / (number of comparisons)">
                  Question Total
                </Tooltip>
              </Td>
              <Td color="gray.100">{stagingMetrics.questionVariability}</Td>
              <Td color="gray.100">{productionMetrics.questionVariability}</Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Maximum question variability found between any two generated exams">
                  Question Max
                </Tooltip>
              </Td>
              <Td color="gray.100">{stagingMetrics.questionVariabilityMax}</Td>
              <Td color="gray.100">
                {productionMetrics.questionVariabilityMax}
              </Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Minimum question variability found between any two generated exams">
                  Question Min
                </Tooltip>
              </Td>
              <Td color="gray.100">{stagingMetrics.questionVariabilityMin}</Td>
              <Td color="gray.100">
                {productionMetrics.questionVariabilityMin}
              </Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Overall answer variability across all generated exams. (sum of variabilities) / (number of comparisons)">
                  Answer Total
                </Tooltip>
              </Td>
              <Td color="gray.100">{stagingMetrics.answerVariability}</Td>
              <Td color="gray.100">{productionMetrics.answerVariability}</Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Maximum answer variability found between any two generated exams">
                  Answer Max
                </Tooltip>
              </Td>
              <Td color="gray.100">{stagingMetrics.answerVariabilityMax}</Td>
              <Td color="gray.100">{productionMetrics.answerVariabilityMax}</Td>
            </Tr>
            <Tr>
              <Td color="gray.100" fontWeight="bold">
                <Tooltip label="Minimum answer variability found between any two generated exams">
                  Answer Min
                </Tooltip>
              </Td>
              <Td color="gray.100">{stagingMetrics.answerVariabilityMin}</Td>
              <Td color="gray.100">{productionMetrics.answerVariabilityMin}</Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    </>
  );
}
