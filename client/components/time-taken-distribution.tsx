import { Box, Spinner } from "@chakra-ui/react";
import {
  ExamEnvironmentExam,
  ExamEnvironmentExamAttempt,
} from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Rectangle,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { secondsToHumanReadable } from "../utils/question";

interface TimeTakenDistributionProps {
  attempts: ExamEnvironmentExamAttempt[];
  exam: ExamEnvironmentExam;
  sigma: number;
}

export function TimeTakenDistribution({
  attempts,
  exam,
  sigma,
}: TimeTakenDistributionProps) {
  // TODO: It would be nice to not re-render every `onChange` for `minX`
  const dataQuery = useQuery({
    queryKey: ["time-taken-distribution", exam.id, sigma],
    queryFn: () => {
      // Calculate completion times for all attempts
      const completionTimes = attempts.map((attempt) => {
        const startTimeInMS = attempt.startTime.getTime();
        const flattened = attempt.questionSets.flatMap((qs) => qs.questions);

        const lastSubmission = Math.max(
          ...flattened.map((f) => {
            return f.submissionTime?.getTime() ?? 0;
          })
        );
        return (lastSubmission - startTimeInMS) / 1000;
      });

      // Create histogram data
      if (completionTimes.length === 0) {
        return null;
      }

      const minTime = Math.min(...completionTimes);
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

      // Calculate normal distribution curve
      const mean =
        completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
      const variance =
        completionTimes.reduce(
          (sum, time) => sum + Math.pow(time - mean, 2),
          0
        ) / completionTimes.length;
      const stdDev = Math.sqrt(variance);

      // Add curve values to data points
      const totalAttempts = completionTimes.length;
      const dataWithCurve = data.map((point) => {
        // Get the midpoint of the time range
        const [start, end] = point.timeRange.split("-").map(Number);
        const midpoint = (start + end) / 2;

        // Calculate normal distribution value
        const exponent =
          -Math.pow(midpoint - mean, 2) / (2 * Math.pow(stdDev, 2));
        const normalValue =
          (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);

        // Scale to match histogram (multiply by total attempts and bracket size)
        const scaledCurve = normalValue * totalAttempts * bracketSize;

        return {
          ...point,
          curve: scaledCurve,
        };
      });

      return dataWithCurve;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (dataQuery.isPending || !dataQuery.data) {
    return <Spinner size="sm" color="teal.400" />;
  }

  return (
    <Box height="400px" mt={6} mb={4}>
      <ResponsiveContainer width={"100%"} height={400}>
        <ComposedChart
          accessibilityLayer
          barCategoryGap="5%"
          barGap={2}
          data={dataQuery.data}
          margin={{
            bottom: 20,
            left: 20,
            right: 30,
            top: 5,
          }}
          syncMethod="index"
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
          <RechartTooltip
            formatter={(value: number, name: string) => {
              if (name === "Normal Distribution") {
                return [`${value.toFixed(2)}`, "Normal Distribution"];
              }
              return [`${value} attempts`, "Count"];
            }}
            labelFormatter={(label: string) => {
              const [start, end] = label.split("-");
              const mid = (Number(start) + Number(end)) / 2;
              const humanReadable = secondsToHumanReadable(mid);
              return `${humanReadable}`;
            }}
            contentStyle={{
              color: "black",
            }}
          />
          <Bar
            activeBar={<Rectangle fill="pink" stroke="blue" />}
            dataKey="count"
            fill="#8884d8"
          />
          <Line
            type="monotone"
            dataKey="curve"
            stroke="#ff7300"
            strokeWidth={2}
            dot={false}
            name="Normal Distribution"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}
