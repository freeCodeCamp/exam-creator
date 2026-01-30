import { Box, Button, useDisclosure } from "@chakra-ui/react";
import { CodeXml, Save } from "lucide-react";
import {
  postValidateConfigByExamId,
  putExamById,
  putExamEnvironmentChallenges,
} from "../utils/fetch";
import {
  ExamCreatorExam,
  ExamEnvironmentChallenge,
  ExamEnvironmentConfig,
  ExamEnvironmentQuestionSet,
} from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { GenerateModal } from "./generate-modal";
import { deserializeToPrisma } from "../utils/serde";
import { queryClient } from "../contexts";
import { toaster } from "./toaster";

interface EditExamActionsProps {
  exam: ExamCreatorExam;
  config: ExamEnvironmentConfig;
  questionSets: ExamEnvironmentQuestionSet[];
  examEnvironmentChallenges: Omit<ExamEnvironmentChallenge, "id">[];
}

export function EditExamActions({
  exam,
  config,
  questionSets,
  examEnvironmentChallenges,
}: EditExamActionsProps) {
  const {
    open: generateIsOpen,
    onOpen: generateOnOpen,
    onClose: generateOnClose,
  } = useDisclosure();

  const invalidConfigMutation = useMutation({
    mutationFn: async (examId: string) => {
      await postValidateConfigByExamId(examId);
    },
    onError(error) {
      toaster.create({
        title: "Invalid Exam Configuration",
        description: error.message,
        type: "loading",
        closable: true,
      });
    },
  });

  const handleDatabaseSave = useMutation({
    mutationFn: ({
      exam,
      examEnvironmentChallenges,
      config,
      questionSets,
    }: {
      exam: ExamCreatorExam;
      examEnvironmentChallenges: Omit<ExamEnvironmentChallenge, "id">[];
      config: ExamEnvironmentConfig;
      questionSets: ExamEnvironmentQuestionSet[];
    }) => {
      return Promise.all([
        putExamById({ ...exam, config, questionSets }),
        putExamEnvironmentChallenges(exam.id, examEnvironmentChallenges),
      ]);
    },
    onSuccess([examData, examEnvironmentChallengesData]) {
      // Update upstream queries cache with new data
      queryClient.setQueryData(
        ["exam", exam.id],
        deserializeToPrisma(examData),
      );
      queryClient.setQueryData(
        ["exam-challenges", exam.id],
        deserializeToPrisma(examEnvironmentChallengesData),
      );
      invalidConfigMutation.mutate(exam.id);
      toaster.create({
        title: "Exam Saved",
        description: "Your exam has been saved to the temporary database.",
        type: "success",
        duration: 1000,
        closable: true,
      });
    },
    onError(error: Error) {
      console.error(error);
      toaster.create({
        title: "Error Saving Exam",
        description: error.message || "An error occurred saving exam.",
        type: "error",
        duration: 5000,
        closable: true,
      });
    },
    retry: false,
  });

  return (
    <Box
      position="fixed"
      top={3}
      right="1rem"
      zIndex={100}
      bg={"bg.panel"}
      borderRadius="xl"
      boxShadow="lg"
      px={2}
      py={2}
      display="flex"
      flexDirection={"column"}
      alignItems="center"
      gap={4}
    >
      <Button
        color="fg.inverted"
        colorPalette="teal"
        variant="solid"
        px={4}
        fontWeight="bold"
        loading={handleDatabaseSave.isPending}
        onClick={() =>
          handleDatabaseSave.mutate({
            exam,
            config,
            questionSets,
            examEnvironmentChallenges,
          })
        }
      >
        <Save size={18} />
        Save to Database
      </Button>
      <Button
        colorPalette="teal"
        color="fg.inverted"
        variant="solid"
        px={4}
        fontWeight="bold"
        onClick={generateOnOpen}
      >
        <CodeXml size={18} />
        Generate Exams
      </Button>
      <GenerateModal
        open={generateIsOpen}
        onClose={generateOnClose}
        examId={exam.id}
      />
    </Box>
  );
}
