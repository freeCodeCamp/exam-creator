import {
  Box,
  Button,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  XAxis,
  YAxis,
  type LegendPayload,
} from "recharts";
import { getExamAttemptStats, getExamsMetrics } from "../utils/fetch";
import { prettyDate } from "../utils/question";
import { useDragZoom } from "../hooks/use-drag-zoom";

export const CHART_COLORS = [
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

const ZOOM_HINT = "drag to zoom · dbl-click reset";
const ZOOM_FILL = "#5b8ff9";

type Bucket = "day" | "week" | "month";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(t: Date): string {
  return t.toISOString().slice(0, 10);
}

function monthKey(t: Date): string {
  return t.toISOString().slice(0, 7);
}

// Monday of the ISO week, as a date label
function weekKey(t: Date): string {
  const d = new Date(
    Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const BUCKET_KEY: Record<Bucket, (t: Date) => string> = {
  day: dayKey,
  week: weekKey,
  month: monthKey,
};

function formatDate(ms: number): string {
  return prettyDate(new Date(ms));
}

const EMPTY_DAILY: { day: string; count: number; cumulative: number }[] = [];
const EMPTY_POINTS: ({ t: number } & Record<string, number>)[] = [];

function ChartCard({
  title,
  span,
  hint,
  height = "300px",
  children,
}: {
  title: string;
  span?: boolean;
  hint?: string;
  height?: string;
  children: React.ReactElement;
}) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={4}
      gridColumn={span ? "1 / -1" : undefined}
    >
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="semibold">{title}</Text>
        {hint && (
          <Text fontSize="xs" color="fg.muted">
            {hint}
          </Text>
        )}
      </HStack>
      <Box height={height}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

export function AttemptAnalytics() {
  const [bucket, setBucket] = useState<Bucket>("week");
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

  const computed = useMemo(() => {
    if (!attemptsQuery.data || !examsQuery.data) {
      return null;
    }

    const exams = examsQuery.data.map(({ exam }, i) => ({
      id: exam.id,
      name: exam.config.name,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    const examIds = new Set(exams.map((e) => e.id));

    const rows = attemptsQuery.data
      .filter((a) => examIds.has(a.examId) && !isNaN(a.startTime.getTime()))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    if (rows.length === 0) {
      return {
        exams,
        rows,
        daily: [],
        perHour: [],
        perDow: [],
        points: [],
      };
    }

    const perDay = new Map<string, number>();
    const perHour = Array.from({ length: 24 }, (_, hour) => ({
      hour: String(hour).padStart(2, "0"),
      count: 0,
    }));
    const perDow = DOW_LABELS.map((dow) => ({ dow, count: 0 }));

    // cumulative per-exam count at each attempt time
    const counters = new Map<string, number>(exams.map((e) => [e.id, 0]));
    const pointMap = new Map<number, Record<string, number>>();

    for (const r of rows) {
      const day = dayKey(r.startTime);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
      perHour[r.startTime.getUTCHours()].count++;
      perDow[r.startTime.getUTCDay()].count++;
      const t = r.startTime.getTime();
      counters.set(r.examId, (counters.get(r.examId) ?? 0) + 1);
      pointMap.set(t, Object.fromEntries(counters));
    }

    const points = [...pointMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([t, counts]) => ({ t, ...counts }));

    // continuous day axis with cumulative running total
    const first = rows[0].startTime;
    const last = rows[rows.length - 1].startTime;
    const daily: { day: string; count: number; cumulative: number }[] = [];
    let run = 0;
    for (
      const d = new Date(dayKey(first));
      d <= last;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const day = d.toISOString().slice(0, 10);
      const count = perDay.get(day) ?? 0;
      run += count;
      daily.push({ day, count, cumulative: run });
    }

    return { exams, rows, daily, perHour, perDow, points };
  }, [attemptsQuery.data, examsQuery.data]);

  const bucketed = useMemo(() => {
    if (!computed) {
      return [];
    }
    const key = BUCKET_KEY[bucket];
    const map = new Map<string, Record<string, number>>();
    for (const r of computed.rows) {
      const k = key(r.startTime);
      const counts = map.get(k) ?? {};
      counts[r.examId] = (counts[r.examId] ?? 0) + 1;
      map.set(k, counts);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([b, counts]) => ({ bucket: b, ...counts }));
  }, [computed, bucket]);

  const cumulativeZoom = useDragZoom(
    computed?.points ?? EMPTY_POINTS,
    (d) => d.t,
  );
  const dailyZoom = useDragZoom(computed?.daily ?? EMPTY_DAILY, (d) => d.day);
  const stackedZoom = useDragZoom(bucketed, (d) => d.bucket);

  if (attemptsQuery.isPending || examsQuery.isPending) {
    return <Spinner size="sm" color="teal.400" />;
  }

  if (!computed) {
    return null;
  }

  const { exams, perHour, perDow } = computed;
  const tooltipStyle = { color: "black" } as const;
  const examName = (id: string) => exams.find((e) => e.id === id)?.name ?? id;

  function handleLegendClick(dataKey: LegendPayload["dataKey"]) {
    const key = String(dataKey ?? "");
    if (!key) return;
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
      <ChartCard
        title="Cumulative attempts over time"
        span
        hint={ZOOM_HINT}
        height="440px"
      >
        <LineChart
          data={cumulativeZoom.zoomedData}
          margin={{ bottom: 20, left: 20, right: 30, top: 5 }}
          {...cumulativeZoom.chartProps}
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
            labelFormatter={(v) => formatDate(Number(v))}
            formatter={(value, name) => [value ?? 0, examName(String(name))]}
            contentStyle={tooltipStyle}
          />
          <Legend
            onClick={(e) => handleLegendClick(e.dataKey)}
            formatter={(value) => (
              <span
                style={{
                  opacity: hidden.has(value) ? 0.35 : 1,
                  cursor: "pointer",
                }}
              >
                {examName(String(value))}
              </span>
            )}
          />
          {exams.map((e) => (
            <Line
              key={e.id}
              type="stepAfter"
              dataKey={e.id}
              name={e.id}
              stroke={e.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
              hide={hidden.has(e.id)}
            />
          ))}
          {cumulativeZoom.refArea && (
            <ReferenceArea
              x1={cumulativeZoom.refArea.left}
              x2={cumulativeZoom.refArea.right}
              fill={ZOOM_FILL}
              fillOpacity={0.2}
            />
          )}
        </LineChart>
      </ChartCard>

      <Box borderWidth="1px" borderRadius="lg" p={4} gridColumn="1 / -1">
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="semibold">Attempts by exam, stacked</Text>
          <HStack gap={3}>
            <Text fontSize="xs" color="fg.muted">
              {ZOOM_HINT}
            </Text>
            {(["day", "week", "month"] as const).map((b) => (
              <Button
                key={b}
                size="xs"
                variant={bucket === b ? "solid" : "outline"}
                colorPalette="teal"
                onClick={() => setBucket(b)}
              >
                {b[0].toUpperCase() + b.slice(1)}
              </Button>
            ))}
          </HStack>
        </HStack>
        <Box height="300px">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stackedZoom.zoomedData}
              margin={{ bottom: 5, left: 0, right: 20, top: 5 }}
              {...stackedZoom.chartProps}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" minTickGap={40} />
              <YAxis allowDecimals={false} />
              <RechartTooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  value ?? 0,
                  examName(String(name)),
                ]}
              />
              <Legend formatter={(value) => examName(String(value))} />
              {exams.map((e) => (
                <Bar
                  key={e.id}
                  dataKey={e.id}
                  stackId="attempts"
                  fill={e.color}
                  isAnimationActive={false}
                />
              ))}
              {stackedZoom.refArea && (
                <ReferenceArea
                  x1={stackedZoom.refArea.left}
                  x2={stackedZoom.refArea.right}
                  fill={ZOOM_FILL}
                  fillOpacity={0.2}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      <ChartCard title="Attempts per day" hint={ZOOM_HINT}>
        <AreaChart
          data={dailyZoom.zoomedData}
          margin={{ bottom: 5, left: 0, right: 20, top: 5 }}
          {...dailyZoom.chartProps}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" minTickGap={40} />
          <YAxis allowDecimals={false} />
          <RechartTooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [value ?? 0, "Attempts"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={CHART_COLORS[0]}
            fill={`${CHART_COLORS[0]}33`}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          {dailyZoom.refArea && (
            <ReferenceArea
              x1={dailyZoom.refArea.left}
              x2={dailyZoom.refArea.right}
              fill={ZOOM_FILL}
              fillOpacity={0.2}
            />
          )}
        </AreaChart>
      </ChartCard>

      <ChartCard title="By hour of day (UTC)">
        <BarChart
          data={perHour}
          margin={{ bottom: 5, left: 0, right: 20, top: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis allowDecimals={false} />
          <RechartTooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [value ?? 0, "Attempts"]}
          />
          <Bar
            dataKey="count"
            fill={CHART_COLORS[2]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartCard>

      <ChartCard title="By day of week (UTC)">
        <BarChart
          data={perDow}
          margin={{ bottom: 5, left: 0, right: 20, top: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dow" />
          <YAxis allowDecimals={false} />
          <RechartTooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [value ?? 0, "Attempts"]}
          />
          <Bar
            dataKey="count"
            fill={CHART_COLORS[3]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartCard>
    </SimpleGrid>
  );
}
