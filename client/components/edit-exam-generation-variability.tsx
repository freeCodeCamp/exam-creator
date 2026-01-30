import { Box, Heading, Spinner, Table, Text } from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { getGenerations } from "../utils/fetch";
import { calculateGenerationMetrics } from "../utils/question";
import { useEffect } from "react";
import { Tooltip } from "./tooltip";

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
        <Heading size="sm" mt={6} mb={2}>
          Exam Generations
        </Heading>
        <Text mb={2}>This is the analysis of the exam generations:</Text>
        <Spinner size="sm" color="teal.400" />
      </>
    );
  }
  if (stagingMetricsMutation.isError || productionMetricsMutation.isError) {
    console.error(stagingMetricsMutation.error);
    console.error(productionMetricsMutation.error);
    return (
      <>
        <Heading size="sm" mt={6} mb={2}>
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
      <Heading size="sm" mt={6} mb={2}>
        Exam Generations
      </Heading>
      <Text mb={2}>This is the analysis of the exam generations:</Text>
      <Box overflowX="auto" borderRadius="md" bg="black" p={2}>
        <Table.Root variant="outline" size="sm" colorPalette="teal">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader color="teal.300">
                Variability
              </Table.ColumnHeader>
              <Table.ColumnHeader>Staging</Table.ColumnHeader>
              <Table.ColumnHeader>Production</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Tooltip content="How many generations are deprecated">
                <Table.Cell fontWeight="bold">
                  Deprecated Generations
                </Table.Cell>
              </Tooltip>
              <Table.Cell>{stagingMetrics.deprecatedGenerations}</Table.Cell>
              <Table.Cell>{productionMetrics.deprecatedGenerations}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Tooltip content="How many non-deprecated generations exist">
                <Table.Cell fontWeight="bold">Total Generations</Table.Cell>
              </Tooltip>
              <Table.Cell>{stagingMetrics.totalGenerations}</Table.Cell>
              <Table.Cell>{productionMetrics.totalGenerations}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Tooltip content="Overall question variability across all live generations. (sum of variabilities) / (number of comparisons)">
                <Table.Cell fontWeight="bold">Question Total</Table.Cell>
              </Tooltip>
              <Table.Cell>{stagingMetrics.questionVariability}</Table.Cell>
              <Table.Cell>{productionMetrics.questionVariability}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Tooltip content="Maximum question variability found between any two live generations">
                <Table.Cell fontWeight="bold">Question Max</Table.Cell>
              </Tooltip>
              <Table.Cell>{stagingMetrics.questionVariabilityMax}</Table.Cell>
              <Table.Cell>
                {productionMetrics.questionVariabilityMax}
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Tooltip content="Minimum question variability found between any two live generations">
                <Table.Cell fontWeight="bold">Question Min</Table.Cell>
              </Tooltip>
              <Table.Cell>{stagingMetrics.questionVariabilityMin}</Table.Cell>
              <Table.Cell>
                {productionMetrics.questionVariabilityMin}
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Tooltip content="Overall answer variability across all live generations. (sum of variabilities) / (number of comparisons)">
                <Table.Cell fontWeight="bold">Answer Total</Table.Cell>
              </Tooltip>
              <Table.Cell>{stagingMetrics.answerVariability}</Table.Cell>
              <Table.Cell>{productionMetrics.answerVariability}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Tooltip content="Maximum answer variability found between any two live generations">
                <Table.Cell fontWeight="bold">Answer Max</Table.Cell>
              </Tooltip>
              <Table.Cell>{stagingMetrics.answerVariabilityMax}</Table.Cell>
              <Table.Cell>{productionMetrics.answerVariabilityMax}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Tooltip content="Minimum answer variability found between any two live generations">
                <Table.Cell fontWeight="bold">Answer Min</Table.Cell>
              </Tooltip>
              <Table.Cell>{stagingMetrics.answerVariabilityMin}</Table.Cell>
              <Table.Cell>{productionMetrics.answerVariabilityMin}</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Box>
    </>
  );
}
