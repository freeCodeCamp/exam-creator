import { Box, Spinner } from "@chakra-ui/react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getExamAttemptStats, getExamsMetrics } from "../utils/fetch";

const CHART_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ff7300",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff8042",
  "#a4de6c",
  "#d0ed57",
  "#ffc658",
];

function formatDate(ms: number): string {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function AttemptCumulativeLine() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const attemptsQuery = useQuery({
    queryKey: ["attempt-metrics"],
    queryFn: () => getExamAttemptStats(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const examsQuery = useQuery({
    queryKey: ["metrics"],
    queryFn: () => getExamsMetrics(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (attemptsQuery.isPending || examsQuery.isPending) {
    return <Spinner size="sm" color="teal.400" />;
  }

  if (!attemptsQuery.data || !examsQuery.data) {
    return null;
  }

  const exams = examsQuery.data.map(({ exam }, i) => ({
    exam,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const examById = new Map(exams.map((e) => [e.exam.id, e]));

  const sorted = [...attemptsQuery.data]
    .filter((a) => examById.has(a.examId))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const counters = new Map<string, number>(exams.map((e) => [e.exam.id, 0]));

  const dataMap = new Map<number, Record<string, number>>();
  for (const attempt of sorted) {
    const t = attempt.startTime.getTime();
    counters.set(attempt.examId, (counters.get(attempt.examId) ?? 0) + 1);
    dataMap.set(t, Object.fromEntries(counters));
  }

  const data = [...dataMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, counts]) => ({ t, ...counts }));

  function handleLegendClick(e: { dataKey?: string }) {
    if (!e.dataKey) return;
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(e.dataKey!)) {
        next.delete(e.dataKey!);
      } else {
        next.add(e.dataKey!);
      }
      return next;
    });
  }

  return (
    <Box height="400px" mt={6} mb={4}>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ bottom: 20, left: 20, right: 30, top: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatDate}
            label={{ position: "insideBottom", offset: -10, value: "Date" }}
          />
          <YAxis
            label={{
              angle: -90,
              position: "insideLeft",
              value: "Cumulative Attempts",
            }}
          />
          <RechartTooltip
            labelFormatter={(v: number) => formatDate(v)}
            formatter={(value: number, name: string) => {
              const e = exams.find((x) => x.exam.id === name);
              return [value, e?.exam.config.name ?? name];
            }}
            contentStyle={{ color: "black" }}
          />
          <Legend
            onClick={handleLegendClick}
            formatter={(value) => {
              const e = exams.find((x) => x.exam.id === value);
              const name = e?.exam.config.name ?? value;
              return (
                <span style={{ opacity: hidden.has(value) ? 0.35 : 1, cursor: "pointer" }}>
                  {name}
                </span>
              );
            }}
          />
          {exams.map(({ exam, color }) => (
            <Line
              key={exam.id}
              type="stepAfter"
              dataKey={exam.id}
              name={exam.id}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
              hide={hidden.has(exam.id)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
