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
import { useMutation } from "@tanstack/react-query";
import { getGenerations } from "../utils/fetch";
import { calculateGenerationMetrics } from "../utils/question";
import { useEffect } from "react";

interface EditExamGenerationVariabilityProps {
  examId: string;
  generatedExamsStagingData?: Awaited<ReturnType<typeof getGenerations>>;
  generatedExamsProductionData?: Awaited<ReturnType<typeof getGenerations>>;
}

export function EditExamGenerationVariability({
  examId,
  generatedExamsStagingData,
  generatedExamsProductionData,
}: EditExamGenerationVariabilityProps) {
  const accent = useColorModeValue("teal.400", "teal.300");
  const stagingMetricsMutation = useMutation({
    mutationKey: ["generation-metrics", examId, "Staging"],
    mutationFn: async ({
      generatedExamsStaging,
    }: {
      generatedExamsStaging: typeof generatedExamsStagingData;
    }) => {
      const metrics = calculateGenerationMetrics(generatedExamsStaging);
      return metrics;
    },
    retry: false,
  });
  const productionMetricsMutation = useMutation({
    mutationKey: ["generation-metrics", examId, "Production"],
    mutationFn: async ({
      generatedExamsProduction,
    }: {
      generatedExamsProduction: typeof generatedExamsProductionData;
    }) => {
      const metrics = calculateGenerationMetrics(generatedExamsProduction);
      return metrics;
    },
    retry: false,
  });

  useEffect(() => {
    if (generatedExamsStagingData) {
      stagingMetricsMutation.mutate({
        generatedExamsStaging: generatedExamsStagingData,
      });
    }
  }, [examId, generatedExamsStagingData]);

  useEffect(() => {
    if (generatedExamsProductionData) {
      productionMetricsMutation.mutate({
        generatedExamsProduction: generatedExamsProductionData,
      });
    }
  }, [examId, generatedExamsProductionData]);

  const stagingMetrics = stagingMetricsMutation.data;
  const productionMetrics = productionMetricsMutation.data;
  if (
    stagingMetricsMutation.isPending ||
    productionMetricsMutation.isPending ||
    stagingMetrics === undefined ||
    productionMetrics === undefined
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
  if (stagingMetricsMutation.isError || productionMetricsMutation.isError) {
    console.error(stagingMetricsMutation.error);
    console.error(productionMetricsMutation.error);
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

  return (
    <>
      <Heading size="sm" color={accent} mt={6} mb={2}>
        Exam Generations
      </Heading>
      <Text color="gray.300" mb={2}>
        This is the analysis of the exam generations:
      </Text>
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
