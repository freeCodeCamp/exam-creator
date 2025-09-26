import { useContext, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createRoute, useParams, useNavigate } from "@tanstack/react-router";
import {
  Box,
  Button,
  Center,
  Text,
  useColorModeValue,
  Avatar,
  Tooltip,
  HStack,
  Spinner,
  SimpleGrid,
  Stack,
  Heading,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip as ReChartsTooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import { rootRoute } from "./root";
import { ProtectedRoute } from "../components/protected-route";
import { UsersWebSocketContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { getAttemptById } from "../utils/fetch";
import { moderationsRoute } from "./moderations";
import { Attempt } from "../types";

function Edit() {
  const { id } = useParams({ from: "/attempts/$id" });
  const { user, logout } = useContext(AuthContext)!;

  const navigate = useNavigate();

  const attemptQuery = useQuery({
    queryKey: ["attempt", id],
    enabled: !!user,
    queryFn: () => getAttemptById(id!),
    retry: false,
    // TODO: This does not work, because it overwrites the current edit before a save
    //       Somehow, the client must always PUT before GET
    //       Potentially, a PATCH request must be used with only the changed data to prevent unwanted overwrites
    // refetchInterval: 5000,
  });

  const bg = useColorModeValue("black", "black");
  const spinnerColor = useColorModeValue("teal.400", "teal.300");

  return (
    <Box minH="100vh" bg={bg} py={14} px={2} position="relative">
      <HStack position="fixed" top={6} left={8} zIndex={101} spacing={3}>
        <Button
          colorScheme="teal"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: moderationsRoute.to })}
        >
          Back to Attempts
        </Button>
        <Button
          colorScheme="red"
          variant="outline"
          size="sm"
          onClick={() => logout()}
        >
          Logout
        </Button>
      </HStack>
      {/* Floating widget: top right */}
      <UsersEditing />
      <Center>
        {attemptQuery.isPending ? (
          <Spinner color={spinnerColor} size="xl" />
        ) : attemptQuery.isError ? (
          <Text color="red.400" fontSize="lg">
            Error loading exam: {attemptQuery.error.message}
          </Text>
        ) : (
          <EditAttempt attempt={attemptQuery.data} />
        )}
      </Center>
    </Box>
  );
}

function UsersEditing() {
  const {
    users,
    error: usersError,
    updateActivity,
  } = useContext(UsersWebSocketContext)!;

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  const filteredUsers = users.filter((u) => {
    const usersPath = u.activity.page.pathname;
    return usersPath === window.location.pathname;
  });

  const cardBg = useColorModeValue("gray.800", "gray.800");
  const avatarTextColor = useColorModeValue("gray.100", "gray.200");
  return (
    <Box
      position="fixed"
      top={4}
      right="18rem"
      zIndex={100}
      bg={cardBg}
      borderRadius="xl"
      boxShadow="lg"
      px={2}
      py={2}
      display="flex"
      alignItems="center"
      gap={4}
    >
      <HStack spacing={-2}>
        {usersError ? (
          <Text color="red.400" fontSize="sm">
            {usersError.message}
          </Text>
        ) : (
          filteredUsers.map((user, idx) => (
            <Tooltip label={user.name} key={user.email}>
              <Avatar
                src={user.picture}
                name={user.name}
                textColor={avatarTextColor}
                size="sm"
                border="2px solid"
                borderColor={cardBg}
                zIndex={5 - idx}
                ml={idx === 0 ? 0 : -2}
                boxShadow="md"
              />
            </Tooltip>
          ))
        )}
      </HStack>
    </Box>
  );
}

function EditAttempt({ attempt }: { attempt: Attempt }) {
  const { updateActivity } = useContext(UsersWebSocketContext)!;
  const simpleGridRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, [attempt]);

  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  const startTimeInMS = attempt.startTime?.getTime() ?? attempt.startTimeInMS;

  // TODO: Consider bar chart with sorted values
  //       Show questions in order final answer was recorded
  const flattened = attempt.questionSets.flatMap((qs) => qs.questions);
  const timeToAnswers = flattened.map((q, i) => {
    const submissionTimeInMS =
      // @ts-expect-error Look into
      q.submissionTime?.getTime() ?? q.submissionTimeInMS ?? 0;
    const secondsSinceStart = (submissionTimeInMS - startTimeInMS) / 1000;
    // Determine if the answer is correct
    const isCorrect = q.answers
      .filter((a) => a.isCorrect)
      // @ts-expect-error Look into
      .every((a) => q.selected && q.selected.includes(a.id));
    return {
      name: i + 1,
      value: secondsSinceStart,
      isCorrect,
    };
  });

  const answered = flattened.filter((f) => {
    // @ts-expect-error Look into
    return !!f.submissionTime && !!f.submissionTimeInMS;
  }).length;
  const correct = flattened.filter((f) => {
    return (
      f.answers
        .filter((a) => a.isCorrect)
        // @ts-expect-error Look into
        .every((a) => f.selected.includes(a.id))
    );
  }).length;
  const lastSubmission = Math.max(
    ...flattened.map((f) => {
      // @ts-expect-error Look into
      return f.submissionTime ?? f.submissionTimeInMS ?? 0;
    })
  );
  const timeToComplete = (lastSubmission - startTimeInMS) / 1000;

  return (
    <>
      <Box
        position="fixed"
        top={3}
        right="1rem"
        zIndex={100}
        bg={cardBg}
        borderRadius="xl"
        boxShadow="lg"
        px={2}
        py={2}
        display="flex"
        alignItems="center"
        gap={4}
      >
        {/* TODO: Awaiting implementation */}
        <Button
          colorScheme="green"
          px={4}
          fontWeight="bold"
          fontSize={"2xl"}
          disabled={true}
        >
          Approve
        </Button>
        {/* TODO: Awaiting implementation */}
        <Button
          colorScheme="red"
          px={4}
          fontWeight="bold"
          fontSize={"2xl"}
          disabled={true}
        >
          Deny
        </Button>
      </Box>
      <Stack spacing={8} w="full" maxW="4xl">
        <Box bg={cardBg} borderRadius="xl" boxShadow="lg" p={8} mb={4} w="full">
          <Heading color={accent} fontWeight="extrabold" fontSize="2xl" mb={2}>
            Moderate Attempt
          </Heading>
          <SimpleGrid
            columns={{ base: 1, md: 1 }}
            spacing={6}
            mb={4}
            ref={simpleGridRef}
          >
            <BarChart
              width={simpleGridRef.current?.offsetWidth ?? 500}
              height={document.body.clientHeight * 0.3}
              data={timeToAnswers}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid stroke="#aaa" strokeDasharray="5 5" />
              <Bar
                type="monotone"
                dataKey="value"
                name="time to answer"
                // Custom fill for each bar
                fill={"purple"}
              >
                {timeToAnswers.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isCorrect ? "green" : "purple"}
                  />
                ))}
              </Bar>
              <XAxis
                dataKey="name"
                label={{
                  value: "question number",
                  position: "insideBottom",
                  offset: 0,
                }}
              />
              <YAxis
                width="auto"
                label={{
                  value: "seconds since exam start",
                  position: "insideBottomLeft",
                  angle: -90,
                  offset: 20,
                }}
              />
              <ReChartsTooltip cursor={false} />
            </BarChart>
            <Grid
              // h="200px"
              templateRows="repeat(2, 1fr)"
              templateColumns="repeat(2, 1fr)"
              gap={4}
            >
              <GridItem rowSpan={1} colSpan={2} color="gray.300">
                Total Questions: {flattened.length}
              </GridItem>
              <GridItem colSpan={1} color="gray.300">
                Total Answered: {answered}
              </GridItem>
              <GridItem colSpan={1} color="gray.300">
                Correct Questions: {correct}
              </GridItem>
              <GridItem colSpan={1} color="gray.300">
                Total Time to Complete [s]: {timeToComplete}
              </GridItem>
            </Grid>
          </SimpleGrid>
        </Box>
      </Stack>
    </>
  );
}

export const editAttemptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/attempts/$id",
  component: () => (
    <ProtectedRoute>
      <Edit />
    </ProtectedRoute>
  ),
});
