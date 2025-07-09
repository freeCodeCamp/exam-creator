import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
  Avatar,
  Tooltip,
  SimpleGrid,
  Flex,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import { Plus } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useContext, useEffect } from "react";

import { rootRoute } from "./root";
import { ExamCard } from "../components/exam-card";
import { getExams, postExam } from "../utils/fetch";
import { ProtectedRoute } from "../components/protected-route";
import { editExamRoute } from "./edit-exam";
import { UsersWebSocketContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";

export function Exams() {
  const { user, logout } = useContext(AuthContext)!;
  const {
    users,
    error: usersError,
    updateActivity,
  } = useContext(UsersWebSocketContext)!;
  const navigate = useNavigate();

  const examsQuery = useQuery({
    queryKey: ["exams"],
    enabled: !!user,
    queryFn: () => getExams(),
    retry: false,
  });
  const createExamMutation = useMutation({
    mutationFn: () => postExam(),
    onSuccess(data, _variables, _context) {
      navigate({
        to: editExamRoute.to,
        params: { id: data.id },
      });
    },
  });

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  const bg = useColorModeValue("gray.900", "gray.900");
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  const examsPath = window.location.pathname;
  const usersOnPage = users.filter((u) => {
    const usersPath = u.activity.page.pathname;
    return usersPath === examsPath;
  });

  return (
    <Box minH="100vh" bg={bg} py={12} px={4}>
      <HStack position="fixed" top={6} left={8} zIndex={101} spacing={3}>
        <Button
          colorScheme="teal"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: landingRoute.to })}
        >
          Back to Dashboard
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
      <Center>
        <Stack spacing={8} w="full" maxW="5xl">
          <Flex
            justify="space-between"
            align="center"
            bg={cardBg}
            borderRadius="xl"
            p={8}
            boxShadow="lg"
            mb={4}
          >
            <Stack spacing={1}>
              <Heading color={accent} fontWeight="extrabold" fontSize="3xl">
                Exam Creator
              </Heading>
              <Text color="gray.300" fontSize="lg">
                Create exams for the Exam Environment.
              </Text>
            </Stack>
            <HStack spacing={-2} ml={4}>
              {usersError ? (
                <Text color="red.400" fontSize="sm">
                  {usersError.message}
                </Text>
              ) : (
                usersOnPage.slice(0, 5).map((user, idx) => (
                  <Tooltip label={user.name} key={user.email}>
                    <Avatar
                      src={user.picture}
                      name={user.name}
                      size="md"
                      border="2px solid"
                      borderColor={bg}
                      zIndex={5 - idx}
                      ml={idx === 0 ? 0 : -3}
                      boxShadow="md"
                    />
                  </Tooltip>
                ))
              )}
              {usersOnPage.length > 5 && (
                <Avatar
                  size="md"
                  bg="gray.700"
                  color="gray.200"
                  ml={-3}
                  zIndex={0}
                  name={`+${usersOnPage.length - 5} more`}
                >
                  +{usersOnPage.length - 5}
                </Avatar>
              )}
            </HStack>
            <Button
              leftIcon={<Plus size={18} />}
              colorScheme="teal"
              variant="solid"
              ml={8}
              px={6}
              fontWeight="bold"
              boxShadow="md"
              _hover={{ bg: "teal.500" }}
              onClick={() => {
                createExamMutation.mutate();
              }}
              isLoading={createExamMutation.isPending}
              isDisabled={createExamMutation.isPending}
              loadingText="Creating Exam"
            >
              New Exam
            </Button>
            {createExamMutation.isError && (
              <Alert
                status="error"
                position="absolute"
                tabIndex={100}
                top={0}
                left={0}
              >
                <AlertIcon />
                <AlertTitle>Unable to create exam!</AlertTitle>
                <AlertDescription>
                  {createExamMutation.error.message}
                </AlertDescription>
              </Alert>
            )}
          </Flex>
          <Box>
            {examsQuery.isPending ? (
              <Center py={12}>
                <Spinner color={accent} size="xl" />
              </Center>
            ) : examsQuery.isError ? (
              <Center>
                <Text color="red.400" fontSize="lg">
                  {examsQuery.error.message}
                </Text>
              </Center>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
                {examsQuery.data.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </SimpleGrid>
            )}
          </Box>
        </Stack>
      </Center>
    </Box>
  );
}

export const examsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exams",
  component: () => (
    <ProtectedRoute>
      <Exams />
    </ProtectedRoute>
  ),
});
