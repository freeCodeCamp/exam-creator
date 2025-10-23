import {
  type ExamEnvironmentQuestionSet,
  type ExamEnvironmentGeneratedExam,
} from "@prisma/client";
import {
  Box,
  Button,
  Textarea,
  Stack,
  Text,
  useColorModeValue,
  FormLabel,
} from "@chakra-ui/react";
import { Plus, X } from "lucide-react";

import {
  change_question_type,
  default_question,
  getBorderStyle,
  getQuestionStatus,
} from "../utils/question";
import { QuestionAccordion } from "./accordian";
import { MultipleChoiceForm } from "./multiple-choice-form";

type DialogueFormProps = {
  questionSet: ExamEnvironmentQuestionSet;
  questionSets: ExamEnvironmentQuestionSet[];
  setQuestionSets: (qs: ExamEnvironmentQuestionSet[]) => void;
  stagingExams: ExamEnvironmentGeneratedExam[] | undefined;
  productionExams: ExamEnvironmentGeneratedExam[] | undefined;
  isLoading: boolean;
  hasGeneratedExams: boolean;
};

export function DialogueForm({
  questionSet,
  questionSets,
  setQuestionSets,
  stagingExams,
  productionExams,
  isLoading,
  hasGeneratedExams,
}: DialogueFormProps) {
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  return (
    <Box bg={cardBg} borderRadius="lg" p={4} mb={4}>
      <Text fontWeight="bold" color={accent} mb={2} id={questionSet.id}>
        Dialogue Form
      </Text>
      <Stack spacing={3}>
        <FormLabel color="gray.300">Dialogue</FormLabel>
        <Textarea
          placeholder="Dialogue..."
          cols={30}
          rows={10}
          value={questionSet.context ?? ""}
          onChange={(e) =>
            change_question_type(
              {
                ...questionSet,
                context: e.target.value,
              },
              questionSets,
              setQuestionSets
            )
          }
          bg="gray.700"
          color="gray.100"
        />
        <Button
          leftIcon={<X size={16} />}
          colorScheme="red"
          variant="ghost"
          size="sm"
          alignSelf="flex-start"
          onClick={(e) => {
            e.preventDefault();
            setQuestionSets(
              questionSets.filter((qt) => qt.id !== questionSet.id)
            );
          }}
        >
          Remove Dialogue
        </Button>
        {questionSet.questions.map((question, index) => {
          const questionStatus = getQuestionStatus(
            question.id,
            stagingExams,
            productionExams
          );
          const questionBorderStyle = getBorderStyle(
            questionStatus,
            isLoading,
            hasGeneratedExams
          );

          return (
            <QuestionAccordion
              key={question.id}
              title={`Question ${index + 1}`}
              subtitle={question.text}
              {...questionBorderStyle}
            >
              <MultipleChoiceForm
                question={question}
                questionSet={questionSet}
                questionSets={questionSets}
                setQuestionSets={setQuestionSets}
                borderColor={questionBorderStyle.borderColor}
                borderStyle={questionBorderStyle.borderStyle}
                borderWidth={questionBorderStyle.borderWidth}
                stagingExams={stagingExams}
                productionExams={productionExams}
                isLoading={isLoading}
                hasGeneratedExams={hasGeneratedExams}
              />
            </QuestionAccordion>
          );
        })}
        <Button
          leftIcon={<Plus size={16} />}
          colorScheme="teal"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            change_question_type(
              {
                ...questionSet,
                questions: [...questionSet.questions, default_question()],
              },
              questionSets,
              setQuestionSets
            );
          }}
        >
          Add Question to Dialogue
        </Button>
      </Stack>
    </Box>
  );
}
