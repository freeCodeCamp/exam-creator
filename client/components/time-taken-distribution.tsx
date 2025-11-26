import {
  Box,
  FormControl,
  FormHelperText,
  FormLabel,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Spinner,
} from "@chakra-ui/react";
import {
  ExamEnvironmentExam,
  ExamEnvironmentExamAttempt,
} from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TimeTakenDistributionProps {
  attempts: ExamEnvironmentExamAttempt[];
  exam: ExamEnvironmentExam;
}

export function TimeTakenDistribution({
  attempts,
  exam,
}: TimeTakenDistributionProps) {
  const [sigma, setSigma] = useState(50);

  const dataQuery = useQuery({
    queryKey: ["time-taken-distribution", exam.id, sigma],
    queryFn: () => {
      // Calculate completion times for all attempts
      const completionTimes = attempts
        .filter((a) => a.questionSets.length > 0)
        .map((attempt) => {
          const startTimeInMS = attempt.startTime.getTime();
          const flattened = attempt.questionSets.flatMap((qs) => qs.questions);

          const lastSubmission = Math.max(
            ...flattened.map((f) => {
              return f.submissionTime?.getTime() ?? 0;
            })
          );
          return (lastSubmission - startTimeInMS) / 1000;
        })
        .filter((time) => time > 0);

      // Create histogram data
      if (completionTimes.length === 0) {
        return null;
      }

      const minTime = 0;
      const maxTime = exam.config.totalTimeInS;
      const range = maxTime - minTime;

      // Dynamic bracket size based on exam time limit
      const bracketSize = Math.ceil(range / sigma);
      const numBrackets = Math.ceil(range / bracketSize);

      // Initialize brackets
      const brackets: { [key: string]: number } = {};
      for (let i = 0; i < numBrackets; i++) {
        const bracketStart = minTime + i * bracketSize;
        const bracketEnd = bracketStart + bracketSize;
        brackets[`${Math.round(bracketStart)}-${Math.round(bracketEnd)}`] = 0;
      }

      // Count attempts in each bracket
      completionTimes.forEach((time) => {
        const bucketIndex = Math.floor((time - minTime) / bracketSize);
        const bracketStart = minTime + bucketIndex * bracketSize;
        const bracketEnd = bracketStart + bracketSize;
        const key = `${Math.round(bracketStart)}-${Math.round(bracketEnd)}`;
        brackets[key] = (brackets[key] || 0) + 1;
      });

      // Convert to chart data
      const data = Object.entries(brackets).map(([range, count]) => ({
        timeRange: range,
        count: count,
      }));
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (dataQuery.isPending || !dataQuery.data) {
    return <Spinner size="sm" color="teal.400" />;
  }

  return (
    <Box>
      <FormControl>
        <FormLabel>Sigma</FormLabel>
        <NumberInput value={sigma} onChange={(v) => setSigma(Number(v))}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <FormHelperText>
          Adjust how many brackets are used in the histogram
        </FormHelperText>
      </FormControl>

      <Box height="400px" mt={6} mb={4}>
        <ResponsiveContainer width={"100%"} height={"100%"}>
          <BarChart
            accessibilityLayer
            barCategoryGap="5%"
            barGap={2}
            data={dataQuery.data}
            height={300}
            margin={{
              bottom: 20,
              left: 20,
              right: 30,
              top: 5,
            }}
            syncMethod="index"
            width={500}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timeRange"
              label={{
                position: "insideBottom",
                offset: -10,
                value: "Time (seconds)",
              }}
            />
            <YAxis
              label={{
                angle: -90,
                position: "insideLeft",
                value: "Number of Attempts",
              }}
            />
            <Tooltip
              formatter={(value: number) => [`${value} attempts`, "Count"]}
              labelFormatter={(label: string) => `Time Range: ${label}s`}
            />
            <Bar
              activeBar={<Rectangle fill="pink" stroke="blue" />}
              dataKey="count"
              fill="#8884d8"
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
