import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
  Avatar,
  SimpleGrid,
  Flex,
  Alert,
  Menu,
  Portal,
  useDisclosure,
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
import { toaster } from "../components/toaster";
import { Tooltip } from "../components/tooltip";

export function Exams() {
  const { user, logout } = useContext(AuthContext)!;
  const { updateActivity } = useContext(UsersWebSocketActivityContext)!;
  const navigate = useNavigate();

  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const {
    open: stagingIsOpen,
    onOpen: stagingOnOpen,
    onClose: stagingOnClose,
  } = useDisclosure();
  const {
    open: productionIsOpen,
    onOpen: productionOnOpen,
    onClose: productionOnClose,
  } = useDisclosure();

  const examsQuery = useQuery({
    queryKey: ["exams"],
    enabled: !!user,
    queryFn: () => getExams(),
    retry: false,
    refetchOnWindowFocus: false,
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
      toaster.create({
        title: "Exams seeded to staging",
        description: "The selected exams have been seeded to staging.",
        type: "success",
        duration: 5000,
        closable: true,
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
      toaster.create({
        title: "Exams seeded to production",
        description: "The selected exams have been seeded to production.",
        type: "success",
        duration: 5000,
        closable: true,
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

  // Intentionally avoid subscribing to users here to prevent full-page re-renders on presence updates.

  return (
    <Box minH="100vh" bg={"bg"} py={12} px={4}>
      <HStack position="fixed" top={3} left={8} zIndex={101} gap={3}>
        <Button
          colorPalette="teal"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: landingRoute.to })}
        >
          Back to Dashboard
        </Button>
        <Button
          colorPalette="red"
          variant="outline"
          size="sm"
          onClick={() => logout()}
        >
          Logout
        </Button>
      </HStack>
      <Center>
        <Stack gap={8} w="full" maxW="7xl">
          <Flex
            justify="space-between"
            align="center"
            bg={"bg"}
            borderRadius="xl"
            p={8}
            boxShadow="lg"
            mb={2}
          >
            <Stack gap={1}>
              <Heading color={"fg.info"} fontWeight="extrabold" fontSize="3xl">
                Exam Creator
              </Heading>
              <Text color="fg.muted" fontSize="lg">
                Create exams for the Exam Environment.
              </Text>
            </Stack>
            <ExamsUsersOnPageAvatars />
            <HStack gap={4} ml={8}>
              <Button
                colorPalette={selectionMode ? "red" : "blue"}
                variant="outline"
                px={6}
                fontWeight="bold"
                onClick={toggleSelectionMode}
              >
                {selectionMode ? <X size={18} /> : null}
                {selectionMode ? "Cancel Selection" : "Select Exams"}
              </Button>
              <Button
                colorPalette="teal"
                variant="solid"
                px={6}
                fontWeight="bold"
                boxShadow="md"
                _hover={{ bg: "teal.500" }}
                onClick={() => {
                  createExamMutation.mutate();
                }}
                loading={createExamMutation.isPending}
                disabled={createExamMutation.isPending}
                loadingText="Creating Exam"
              >
                <Plus size={18} />
                New Exam
              </Button>
            </HStack>
            {createExamMutation.isError && (
              <Alert.Root
                status="error"
                position="absolute"
                tabIndex={100}
                top={0}
                left={0}
              >
                <Alert.Indicator />
                <Alert.Title>Unable to create exam!</Alert.Title>
                <Alert.Description>
                  {createExamMutation.error.message}
                </Alert.Description>
              </Alert.Root>
            )}
          </Flex>

          {selectionMode && (
            <Flex
              justify="space-between"
              align="center"
              bg={"bg.subtle"}
              borderRadius="xl"
              p={6}
              boxShadow="lg"
              mb={2}
            >
              <HStack gap={4}>
                <Text color="fg" fontSize="md">
                  {selectedExams.size} exam{selectedExams.size !== 1 ? "s" : ""}{" "}
                  selected
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="teal"
                  onClick={handleSelectAll}
                  disabled={!examsQuery.data}
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="red"
                  onClick={handleDeselectAll}
                  disabled={selectedExams.size === 0}
                >
                  Deselect All
                </Button>
              </HStack>
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button bg="bg" color="fg">
                    Actions
                    <ChevronDownIcon />
                  </Button>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content backgroundColor="bg" borderColor="border">
                      <Menu.Item
                        value="export-selected"
                        asChild
                        backgroundColor="bg"
                        borderRadius={0}
                        boxShadow="md"
                        color={"white"}
                        colorPalette="green"
                        fontWeight="bold"
                        justifyContent={"flex-start"}
                        _hover={{ bg: "green.500" }}
                      >
                        <Button
                          loadingText={"Prepping Export"}
                          disabled={
                            selectedExams.size === 0 ||
                            examByIdMutation.isPending
                          }
                          onClick={handleExportSelected}
                          loading={examByIdMutation.isPending}
                        >
                          <Download size={18} />
                          Export Selected
                        </Button>
                      </Menu.Item>
                      <Menu.Item
                        asChild
                        value="seed-to-staging"
                        backgroundColor="bg"
                        borderRadius={0}
                        boxShadow="md"
                        color={"white"}
                        colorPalette="green"
                        fontWeight="bold"
                        justifyContent={"flex-start"}
                        _hover={{ bg: "green.500" }}
                      >
                        <Button
                          disabled={
                            selectedExams.size === 0 ||
                            seedExamToStagingMutation.isPending
                          }
                          loading={seedExamToStagingMutation.isPending}
                          loadingText={"Seed in progress"}
                          onClick={stagingOnOpen}
                        >
                          <CodeXml size={18} />
                          Seed to Staging
                        </Button>
                      </Menu.Item>
                      <Menu.Item
                        value={"seed-to-production"}
                        asChild
                        backgroundColor="bg"
                        borderRadius={0}
                        boxShadow="md"
                        color={"white"}
                        colorPalette="green"
                        fontWeight="bold"
                        justifyContent={"flex-start"}
                        _hover={{ bg: "green.500" }}
                      >
                        <Button
                          disabled={
                            selectedExams.size === 0 ||
                            seedExamToProductionMutation.isPending
                          }
                          loading={seedExamToProductionMutation.isPending}
                          loadingText={"Seed in progress"}
                          onClick={productionOnOpen}
                        >
                          <AppWindow size={18} />
                          Seed to Production
                        </Button>
                      </Menu.Item>
                      {/* TODO: Probably never going to create such functionality */}
                      <Menu.Item
                        value="delete"
                        asChild
                        backgroundColor="bg"
                        borderRadius={0}
                        boxShadow="md"
                        color={"white"}
                        colorPalette="green"
                        fontWeight="bold"
                        justifyContent={"flex-start"}
                        _hover={{ bg: "green.500" }}
                      >
                        <Button disabled={true}>
                          <Trash2 size={18} />
                          Delete (TBD)
                        </Button>
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>
            </Flex>
          )}
          <Box>
            {examsQuery.isPending ? (
              <Center py={12}>
                <Spinner color={"fg.info"} size="xl" />
              </Center>
            ) : examsQuery.isError ? (
              <Center>
                <Text color="red.400" fontSize="lg">
                  {examsQuery.error.message}
                </Text>
              </Center>
            ) : (
              <SimpleGrid minChildWidth={"380px"} gap={8}>
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
        open={stagingIsOpen}
        onClose={stagingOnClose}
        handleSeedSelectedToStaging={handleSeedSelectedToStaging}
        seedExamToStagingMutation={seedExamToStagingMutation}
      />
      <SeedProductionModal
        open={productionIsOpen}
        onClose={productionOnClose}
        handleSeedSelectedToProduction={handleSeedSelectedToProduction}
        seedExamToProductionMutation={seedExamToProductionMutation}
      />
    </Box>
  );
}

function ExamsUsersOnPageAvatars() {
  const { users: usersOnPage, error: usersError } = useUsersOnPath("/exams");
  const bg = "black";

  return (
    <HStack gap={-2} ml={4}>
      {usersError ? (
        <Text color="red.400" fontSize="sm">
          {usersError.message}
        </Text>
      ) : (
        usersOnPage.slice(0, 5).map((user, idx) => (
          <Avatar.Root
            key={user.email}
            size="md"
            border="2px solid"
            borderColor={bg}
            zIndex={5 - idx}
            ml={idx === 0 ? 0 : -3}
            boxShadow="md"
          >
            <Avatar.Image src={user.picture ?? undefined} />
            <Tooltip content={user.name}>
              <Avatar.Fallback name={user.name} />
            </Tooltip>
          </Avatar.Root>
        ))
      )}
      {usersOnPage.length > 5 && (
        <Avatar.Root
          size="md"
          bg="gray.700"
          color="gray.200"
          ml={-3}
          zIndex={0}
        >
          <Avatar.Fallback name={`+${usersOnPage.length - 5} more`}>
            +{usersOnPage.length - 5}
          </Avatar.Fallback>
        </Avatar.Root>
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
