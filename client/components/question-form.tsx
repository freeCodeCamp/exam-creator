import { useMemo } from "react";
import {
  type ExamEnvironmentQuestionSet,
  type ExamEnvironmentGeneratedExam,
} from "@prisma/client";
import {
  Box,
  Button,
  HStack,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import { Plus } from "lucide-react";

import {
  getBorderStyle,
  getQuestionSetStatus,
  getQuestionStatus,
  new_question_type,
} from "../utils/question";
import { QuestionAccordion } from "./accordian";
import { UseQueryResult } from "@tanstack/react-query";
import { MultipleChoiceForm } from "./multiple-choice-form";
import { DialogueForm } from "./dialogue-form";

type QuestionFormProps = {
  searchIds: string[];
  questionSets: ExamEnvironmentQuestionSet[];
  setQuestionSets: (qs: ExamEnvironmentQuestionSet[]) => void;
  generatedExamsStagingQuery: UseQueryResult<
    ExamEnvironmentGeneratedExam[],
    Error
  >;
  generatedExamsProductionQuery: UseQueryResult<
    ExamEnvironmentGeneratedExam[],
    Error
  >;
};

export function QuestionForm({
  searchIds,
  questionSets,
  setQuestionSets,
  generatedExamsStagingQuery,
  generatedExamsProductionQuery,
}: QuestionFormProps) {
  const cardBg = useColorModeValue("gray.800", "gray.800");

  const isLoading =
    generatedExamsStagingQuery.isFetching ||
    generatedExamsProductionQuery.isFetching ||
    generatedExamsStagingQuery.isPending ||
    generatedExamsProductionQuery.isPending;

  const stagingExams = generatedExamsStagingQuery.data;
  const productionExams = generatedExamsProductionQuery.data;

  const hasGeneratedExams = useMemo(() => {
    return !!(
      (stagingExams && stagingExams.length > 0) ||
      (productionExams && productionExams.length > 0)
    );
  }, [stagingExams, productionExams]);

  return (
    <Box bg={cardBg} borderRadius="lg" p={4} mb={4}>
      <Stack spacing={4}>
        {questionSets
          .filter((qt) => {
            const searchEmpty = searchIds.length === 0;
            const resultIsQuestionSet = searchIds.includes(qt.id);
            const resultInQuestionSet = qt.questions.some((q) =>
              searchIds.includes(q.id)
            );

            if (!resultInQuestionSet && !resultIsQuestionSet && !searchEmpty) {
              return false;
            }

            return true;
          })
          .map((qt) => {
            switch (qt.type) {
              case "MultipleChoice":
                const question = qt.questions.at(0);
                if (!question) {
                  // Remove question type
                  setQuestionSets(questionSets.filter((q) => q.id !== qt.id));
                  return null;
                }

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
                    key={qt.id}
                    title={`Question Set ${qt.id}`}
                    subtitle={question.text}
                    {...questionBorderStyle}
                  >
                    <MultipleChoiceForm
                      question={question}
                      questionSet={qt}
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
              case "Dialogue":
                const setStatus = getQuestionSetStatus(
                  qt.id,
                  stagingExams,
                  productionExams
                );
                const setBorderStyle = getBorderStyle(
                  setStatus,
                  isLoading,
                  hasGeneratedExams
                );

                return (
                  <QuestionAccordion
                    key={qt.id}
                    title={`Dialogue Question Set ${qt.id}`}
                    subtitle={`${qt.context ?? "none"}`}
                    {...setBorderStyle}
                  >
                    <DialogueForm
                      questionSet={qt}
                      questionSets={questionSets}
                      setQuestionSets={setQuestionSets}
                      stagingExams={stagingExams}
                      productionExams={productionExams}
                      isLoading={isLoading}
                      hasGeneratedExams={hasGeneratedExams}
                    />
                  </QuestionAccordion>
                );
            }
          })}
        <HStack>
          <Button
            leftIcon={<Plus size={16} />}
            colorScheme="teal"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              setQuestionSets([
                ...questionSets,
                new_question_type("MultipleChoice"),
              ]);
            }}
          >
            Add Multiple Choice Question
          </Button>
          <Button
            leftIcon={<Plus size={16} />}
            colorScheme="teal"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              setQuestionSets([...questionSets, new_question_type("Dialogue")]);
            }}
          >
            Add Dialogue Question
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}
