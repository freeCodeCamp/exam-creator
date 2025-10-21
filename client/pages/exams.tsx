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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useContext, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createRoute, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Download,
  X,
  ChevronDownIcon,
  CodeXml,
  AppWindow,
  Trash2,
} from "lucide-react";

import { rootRoute } from "./root";
import { ExamCard } from "../components/exam-card";
import {
  getExamById,
  getExams,
  postExam,
  putExamByIdToProduction,
  putExamByIdToStaging,
} from "../utils/fetch";
import { ProtectedRoute } from "../components/protected-route";
import { editExamRoute } from "./edit-exam";
import { UsersWebSocketActivityContext } from "../contexts/users-websocket";
import { AuthContext } from "../contexts/auth";
import { landingRoute } from "./landing";
import { serializeFromPrisma } from "../utils/serde";
import {
  SeedProductionModal,
  SeedStagingModal,
} from "../components/seed-modal";
import { useUsersOnPath } from "../hooks/use-users-on-path";

export function Exams() {
  const { user, logout } = useContext(AuthContext)!;
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const navigate = useNavigate();
  const toast = useToast();

  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const {
    isOpen: stagingIsOpen,
    onOpen: stagingOnOpen,
    onClose: stagingOnClose,
  } = useDisclosure();
  const {
    isOpen: productionIsOpen,
    onOpen: productionOnOpen,
    onClose: productionOnClose,
  } = useDisclosure();

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
  const examByIdMutation = useMutation({
    mutationFn: (examIds: string[]) => {
      const promises = examIds.map((id) => getExamById(id));
      return Promise.all(promises);
    },
    onSuccess(data, _variables, _context) {
      const serialized = serializeFromPrisma(data, -1);
      const dataStr = JSON.stringify(serialized, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `exams-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      handleDeselectAll();
    },
  });

  const seedExamToStagingMutation = useMutation({
    mutationFn: (examIds: string[]) => {
      const promises = examIds.map((id) => putExamByIdToStaging(id));
      return Promise.all(promises);
    },
    onSuccess(_data, _variables, _context) {
      stagingOnClose();
      handleDeselectAll();
      examsQuery.refetch();
      toast({
        title: "Exams seeded to staging",
        description: "The selected exams have been seeded to staging.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const seedExamToProductionMutation = useMutation({
    mutationFn: (examIds: string[]) => {
      const promises = examIds.map((id) => putExamByIdToProduction(id));
      return Promise.all(promises);
    },
    onSuccess(_data, _variables, _context) {
      productionOnClose();
      handleDeselectAll();
      examsQuery.refetch();
      toast({
        title: "Exams seeded to production",
        description: "The selected exams have been seeded to production.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  function handleExamSelection(examId: string, selected: boolean) {
    setSelectedExams((prev) => {
      const newSelection = new Set(prev);
      if (selected) {
        newSelection.add(examId);
      } else {
        newSelection.delete(examId);
      }
      return newSelection;
    });
  }

  function handleSelectAll() {
    if (examsQuery.data) {
      setSelectedExams(new Set(examsQuery.data.map(({ exam }) => exam.id)));
    }
  }

  function handleDeselectAll() {
    setSelectedExams(new Set());
  }

  function handleExportSelected() {
    if (!examsQuery.data || selectedExams.size === 0) return;

    const examIds = [...selectedExams];

    examByIdMutation.mutate(examIds);
  }

  function handleSeedSelectedToStaging() {
    if (!examsQuery.data || selectedExams.size === 0) return;

    const examIds = [...selectedExams];

    seedExamToStagingMutation.mutate(examIds);
  }

  function handleSeedSelectedToProduction() {
    if (!examsQuery.data || selectedExams.size === 0) return;

    const examIds = [...selectedExams];

    seedExamToProductionMutation.mutate(examIds);
  }

  function toggleSelectionMode() {
    setSelectionMode(!selectionMode);
    setSelectedExams(new Set());
  }

  useEffect(() => {
    updateActivity({
      page: new URL(window.location.href),
      lastActive: Date.now(),
    });
  }, []);

  const bg = useColorModeValue("black", "black");
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  // Intentionally avoid subscribing to users here to prevent full-page re-renders on presence updates.

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
            <ExamsUsersOnPageAvatars />
            <HStack spacing={4} ml={8}>
              <Button
                leftIcon={selectionMode ? <X size={18} /> : undefined}
                colorScheme={selectionMode ? "red" : "blue"}
                variant="outline"
                px={6}
                fontWeight="bold"
                onClick={toggleSelectionMode}
              >
                {selectionMode ? "Cancel Selection" : "Select Exams"}
              </Button>
              <Button
                leftIcon={<Plus size={18} />}
                colorScheme="teal"
                variant="solid"
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
            </HStack>
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

          {selectionMode && (
            <Flex
              justify="space-between"
              align="center"
              bg={cardBg}
              borderRadius="xl"
              p={6}
              boxShadow="lg"
              mb={4}
            >
              <HStack spacing={4}>
                <Text color="gray.300" fontSize="md">
                  {selectedExams.size} exam{selectedExams.size !== 1 ? "s" : ""}{" "}
                  selected
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="teal"
                  onClick={handleSelectAll}
                  isDisabled={!examsQuery.data}
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="red"
                  onClick={handleDeselectAll}
                  isDisabled={selectedExams.size === 0}
                >
                  Deselect All
                </Button>
              </HStack>
              <Menu>
                <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                  Actions
                </MenuButton>
                <MenuList backgroundColor="gray.800">
                  <MenuItem
                    as={Button}
                    backgroundColor="gray.800"
                    borderRadius={0}
                    boxShadow="md"
                    color={"white"}
                    colorScheme="green"
                    fontWeight="bold"
                    isDisabled={
                      selectedExams.size === 0 || examByIdMutation.isPending
                    }
                    isLoading={examByIdMutation.isPending}
                    justifyContent={"flex-start"}
                    leftIcon={<Download size={18} />}
                    loadingText={"Prepping Export"}
                    onClick={handleExportSelected}
                    _hover={{ bg: "green.500" }}
                  >
                    Export Selected
                  </MenuItem>
                  <MenuItem
                    as={Button}
                    backgroundColor="gray.800"
                    borderRadius={0}
                    boxShadow="md"
                    color={"white"}
                    colorScheme="green"
                    fontWeight="bold"
                    isDisabled={
                      selectedExams.size === 0 ||
                      seedExamToStagingMutation.isPending
                    }
                    isLoading={seedExamToStagingMutation.isPending}
                    justifyContent={"flex-start"}
                    leftIcon={<CodeXml size={18} />}
                    loadingText={"Seed in progress"}
                    onClick={stagingOnOpen}
                    _hover={{ bg: "green.500" }}
                  >
                    Seed to Staging
                  </MenuItem>
                  <MenuItem
                    as={Button}
                    backgroundColor="gray.800"
                    borderRadius={0}
                    boxShadow="md"
                    color={"white"}
                    colorScheme="green"
                    fontWeight="bold"
                    isDisabled={
                      selectedExams.size === 0 ||
                      seedExamToProductionMutation.isPending
                    }
                    isLoading={seedExamToProductionMutation.isPending}
                    justifyContent={"flex-start"}
                    leftIcon={<AppWindow size={18} />}
                    loadingText={"Seed in progress"}
                    onClick={productionOnOpen}
                    _hover={{ bg: "green.500" }}
                  >
                    Seed to Production
                  </MenuItem>
                  {/* TODO: Probably never going to create such functionality */}
                  <MenuItem
                    as={Button}
                    backgroundColor="gray.800"
                    borderRadius={0}
                    boxShadow="md"
                    color={"white"}
                    colorScheme="green"
                    fontWeight="bold"
                    isDisabled={true}
                    justifyContent={"flex-start"}
                    leftIcon={<Trash2 size={18} />}
                    _hover={{ bg: "green.500" }}
                  >
                    Delete (TBD)
                  </MenuItem>
                </MenuList>
              </Menu>
            </Flex>
          )}
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
                {examsQuery.data.map(({ exam, databaseEnvironments }) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    databaseEnvironments={databaseEnvironments}
                    isSelected={selectedExams.has(exam.id)}
                    onSelectionChange={handleExamSelection}
                    selectionMode={selectionMode}
                  />
                ))}
              </SimpleGrid>
            )}
          </Box>
        </Stack>
      </Center>
      <SeedStagingModal
        isOpen={stagingIsOpen}
        onClose={stagingOnClose}
        handleSeedSelectedToStaging={handleSeedSelectedToStaging}
        seedExamToStagingMutation={seedExamToStagingMutation}
      />
      <SeedProductionModal
        isOpen={productionIsOpen}
        onClose={productionOnClose}
        handleSeedSelectedToProduction={handleSeedSelectedToProduction}
        seedExamToProductionMutation={seedExamToProductionMutation}
      />
    </Box>
  );
}

function ExamsUsersOnPageAvatars() {
  const { users: usersOnPage, error: usersError } = useUsersOnPath("/exams");
  const bg = useColorModeValue("black", "black");

  return (
    <HStack spacing={-2} ml={4}>
      {usersError ? (
        <Text color="red.400" fontSize="sm">
          {usersError.message}
        </Text>
      ) : (
        usersOnPage.slice(0, 5).map((user, idx) => (
          <Tooltip label={user.name} key={user.email}>
            <Avatar
              src={user.picture ?? undefined}
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
