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

  function calculateGenerationMetrics(
    generatedExams: Awaited<ReturnType<typeof getGenerations>> | undefined
  ) {
    console.log("Working");
    if (!generatedExams || generatedExams.length === 0) {
      return {
        totalGenerations: 0,
        questionVariability: "-",
        questionVariabilityMax: "-",
        questionVariabilityMin: "-",
        answerVariability: "-",
        answerVariabilityMax: "-",
        answerVariabilityMin: "-",
      };
    }

    const totalGenerations = generatedExams.length;

    // Variability is considered: (number of different) / (total)
    // For final variability, it is: (sum of variabilities) / (number of comparisons)

    // Compare all generations to each other to find variability
    // - Compare A to B, A to C, and B to C
    const questions = generatedExams.map((gen) =>
      gen.questionSets.flatMap((qs) => qs.questions)
    );
    let questionVariability = 0;
    let questionVariabilityMax = 0;
    let questionVariabilityMin = 1;
    // questions: [[1,2,3],[1,2,4]] | [[1,2,3], [4,5,6]]
    const questionVariabilities: number[] = compare(questions, (a, b) => {
      if (a.length !== b.length) {
        console.error("Generations have different number of questions", a, b);
      }
      // uniqueQuestions: [1,2,3,4] | [1,2,3,4,5,6]
      const uniqueQuestions = [];
      for (const q of a) {
        uniqueQuestions.push(q.id);
      }
      for (const q of b) {
        if (!uniqueQuestions.includes(q.id)) {
          uniqueQuestions.push(q.id);
        }
      }
      // v: (4 - 3) / 3 = 0.333 | (6 - 3) / 3 = 1
      // v: (unique questions) / (total questions per generation)
      const v = (uniqueQuestions.length - a.length) / a.length;
      questionVariability += v;
      if (v > questionVariabilityMax) {
        questionVariabilityMax = v;
      }
      if (v < questionVariabilityMin) {
        questionVariabilityMin = v;
      }
      return v;
    });
    questionVariability =
      questionVariabilities.length > 0
        ? questionVariability / questionVariabilities.length
        : 0;

    const answers = generatedExams.map((gen) =>
      gen.questionSets.flatMap((qs) => qs.questions).flatMap((q) => q.answers)
    );
    let answerVariability = 0;
    let answerVariabilityMax = 0;
    let answerVariabilityMin = 1;
    const answerVariabilities: number[] = compare(answers, (a, b) => {
      const uniqueAnswers = [];
      for (const q of a) {
        uniqueAnswers.push(q);
      }
      for (const q of b) {
        if (!uniqueAnswers.includes(q)) {
          uniqueAnswers.push(q);
        }
      }
      const v = (uniqueAnswers.length - a.length) / a.length;
      answerVariability += v;
      if (v > answerVariabilityMax) {
        answerVariabilityMax = v;
      }
      if (v < answerVariabilityMin) {
        answerVariabilityMin = v;
      }
      return v;
    });
    answerVariability =
      answerVariabilities.length > 0
        ? answerVariability / answerVariabilities.length
        : 0;

    return {
      totalGenerations,
      questionVariability: questionVariability.toFixed(3),
      questionVariabilityMax: questionVariabilityMax.toFixed(3),
      questionVariabilityMin: questionVariabilityMin.toFixed(3),
      answerVariability: answerVariability.toFixed(3),
      answerVariabilityMax: answerVariabilityMax.toFixed(3),
      answerVariabilityMin: answerVariabilityMin.toFixed(3),
    };
  }

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
