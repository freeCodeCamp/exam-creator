import { Box, Button, useColorModeValue, useToast } from "@chakra-ui/react";
import { CodeXml, Save } from "lucide-react";
import { putExamById, putExamEnvironmentChallenges } from "../utils/fetch";
import { ExamCreatorExam, ExamEnvironmentChallenge } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";

interface EditExamActionsProps {
  exam: ExamCreatorExam;
  examEnvironmentChallenges: Omit<ExamEnvironmentChallenge, "id">[];
}

export function EditExamActions({
  exam,
  examEnvironmentChallenges,
}: EditExamActionsProps) {
  const toast = useToast();

  const handleDatabaseSave = useMutation({
    mutationFn: ({
      exam,
      examEnvironmentChallenges,
    }: {
      exam: ExamCreatorExam;
      examEnvironmentChallenges: Omit<ExamEnvironmentChallenge, "id">[];
    }) => {
      return Promise.all([
        putExamById(exam),
        putExamEnvironmentChallenges(exam.id, examEnvironmentChallenges),
      ]);
    },
    // onSuccess([examData, examEnvironmentChallengesData]) {
    onSuccess() {
      // TODO: Probably necessary if "co-edit" (live) feature is re-enabled
      // setExam(examData);
      // setExamEnvironmentChallenges(examEnvironmentChallengesData);
      toast({
        title: "Exam Saved",
        description: "Your exam has been saved to the temporary database.",
        status: "success",
        duration: 1000,
        isClosable: true,
        position: "top-right",
      });
    },
    onError(error: Error) {
      console.error(error);
      toast({
        title: "Error Saving Exam",
        description: error.message || "An error occurred saving exam.",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    },
    retry: false,
  });
  const cardBg = useColorModeValue("gray.900", "gray.900");
  return (
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
      flexDirection={"column"}
      alignItems="center"
      gap={4}
    >
      <Button
        leftIcon={<Save size={18} />}
        colorScheme="teal"
        variant="solid"
        px={4}
        fontWeight="bold"
        isLoading={handleDatabaseSave.isPending}
        onClick={() =>
          handleDatabaseSave.mutate({ exam, examEnvironmentChallenges })
        }
      >
        Save to Database
      </Button>
      <Button
        leftIcon={<CodeXml size={18} />}
        colorScheme="teal"
        variant="solid"
        px={4}
        fontWeight="bold"
      >
        Generate Exams
      </Button>
    </Box>
  );
}
