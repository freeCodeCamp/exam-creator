import { useEffect, useRef, useState, useMemo } from "react";
import {
  ExamCreatorExam,
  type ExamEnvironmentMultipleChoiceQuestion,
  type ExamEnvironmentQuestionSet,
  type ExamEnvironmentGeneratedExam,
  // type ExamEnvironmentQuestionType,
} from "@prisma/client";
import {
  Box,
  Button,
  Input,
  Textarea,
  Checkbox,
  HStack,
  Stack,
  Text,
  useColorModeValue,
  IconButton,
  FormLabel,
} from "@chakra-ui/react";
import { Plus, X } from "lucide-react";

import {
  change_question,
  change_question_type,
  default_question,
  default_question_answer,
  default_question_audio,
  new_question_type,
  parseMarkdown,
  remove_question,
} from "../utils/question";
import { QuestionAccordion } from "./accordian";

type QuestionStatus = {
  inStaging: boolean;
  inProduction: boolean;
  stagingCount: number;
  productionCount: number;
  totalCount: number;
};

type QuestionSetStatus = QuestionStatus;

type MultipleChoiceFormProps = {
  question: ExamEnvironmentMultipleChoiceQuestion;
  questionSet: ExamEnvironmentQuestionSet;
  questionSets: ExamEnvironmentQuestionSet[];
  setExam: (partialExam: Partial<ExamCreatorExam>) => void;
  borderColor?: string;
  borderStyle?: string;
  borderWidth?: string;
};

export function MultipleChoiceForm({
  question,
  questionSet,
  questionSets,
  setExam,
  borderColor = "gray.700",
  borderStyle = "solid",
  borderWidth = "1px",
}: MultipleChoiceFormProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isAudioVisible, setIsAudioVisible] = useState(false);
  const audioDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Without the audio observer debouncing,
        // it is possible to get stuck unable to scroll beyond the element,
        // because it pops in and out of existance - adjusting the page's frame
        if (audioDebounceRef.current) {
          clearTimeout(audioDebounceRef.current);
        }
        // @ts-expect-error Nodejs type used for some reason
        audioDebounceRef.current = setTimeout(() => {
          if (entry.isIntersecting) {
            setIsAudioVisible(true);
          } else {
            setIsAudioVisible(false);
          }
        }, 250);
      },
      { threshold: 0.1 }
    );

    if (audioInputRef.current) {
      observer.observe(audioInputRef.current);
    }

    return () => {
      if (audioInputRef.current) {
        observer.unobserve(audioInputRef.current);
      }
    };
  }, []);

  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  return (
    <Box
      bg={cardBg}
      borderRadius="lg"
      p={4}
      mb={4}
      borderWidth={borderWidth}
      borderColor={borderColor}
      borderStyle={borderStyle}
    >
      <Text fontWeight="bold" color={accent} mb={2} id={question.id}>
        Multiple Choice Form
      </Text>
      <Stack spacing={3}>
        <Checkbox
          isChecked={question.deprecated}
          onChange={(e) => {
            change_question(
              {
                ...question,
                deprecated: e.target.checked,
              },
              questionSets,
              setExam
            );
          }}
          color="gray.300"
          alignSelf="flex-end"
          colorScheme="red"
        >
          Deprecated
        </Checkbox>
        <FormLabel color="gray.300">Context</FormLabel>
        <Textarea
          placeholder=""
          value={questionSet.context ?? ""}
          onChange={(e) =>
            change_question_type(
              {
                ...questionSet,
                context: e.target.value,
              },
              questionSets,
              setExam
            )
          }
          bg="gray.700"
          color="gray.100"
        />
        <FormLabel color="gray.300">Question</FormLabel>
        <Textarea
          placeholder="Text"
          value={question.text}
          onChange={(e) => {
            change_question(
              {
                ...question,
                text: e.target.value,
              },
              questionSets,
              setExam
            );
          }}
          bg="gray.700"
          color="gray.100"
        />
        <FormLabel color="gray.300">Tags</FormLabel>
        <Input
          type="text"
          placeholder="tag_one,tag two,tag-three"
          value={question.tags.join(",")}
          onChange={(e) => {
            const tags = e.target.value.split(",").map((t) => t.trim());
            change_question(
              {
                ...question,
                tags,
              },
              questionSets,
              setExam
            );
          }}
          bg="gray.700"
          color="gray.100"
        />
        <FormLabel color="gray.300">Audio URL</FormLabel>
        <Input
          type="text"
          placeholder="URL"
          ref={audioInputRef}
          value={question.audio?.url ?? ""}
          onChange={(e) => {
            const question_audio = question.audio ?? default_question_audio();
            const audio = {
              ...question_audio,
              url: e.target.value,
            };
            change_question(
              {
                ...question,
                audio,
              },
              questionSets,
              setExam
            );
          }}
          bg="gray.700"
          color="gray.100"
        />
        {question.audio?.url && isAudioVisible && (
          <Box bg="gray.700" borderRadius="md" p={2} mt={2}>
            <audio
              controls
              src={question.audio.url}
              style={{ width: "100%" }}
            />
          </Box>
        )}
        <Input
          type="text"
          placeholder="Audio Captions"
          value={question.audio?.captions ?? ""}
          onChange={(e) => {
            const question_audio = question.audio ?? default_question_audio();
            const captions = e.target.value;
            const audio = {
              ...question_audio,
              captions,
            };
            change_question(
              {
                ...question,
                audio,
              },
              questionSets,
              setExam
            );
          }}
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
            remove_question(question, questionSets, setExam);
          }}
        >
          Remove Question
        </Button>
        <Text fontWeight="bold" color={accent} mt={4}>
          Answers
        </Text>
        {question.answers.map((answer) => (
          <Box key={answer.id} mb={3} p={2} bg="gray.700" borderRadius="md">
            <Box
              className="answer-markdown"
              color="gray.300"
              mb={1}
              dangerouslySetInnerHTML={{ __html: parseMarkdown(answer.text) }}
            />
            <Textarea
              placeholder="Answer..."
              rows={2}
              value={answer.text}
              onChange={(e) => {
                const updated_answer = {
                  ...answer,
                  text: e.target.value,
                };
                change_question(
                  {
                    ...question,
                    answers: question.answers.map((a) =>
                      a.id === answer.id ? updated_answer : a
                    ),
                  },
                  questionSets,
                  setExam
                );
              }}
              bg="gray.800"
              color="gray.100"
              mb={2}
            />
            <HStack justify="space-between">
              <Checkbox
                colorScheme="teal"
                color="gray.400"
                isChecked={answer.isCorrect}
                onChange={(e) => {
                  const updated_answer = {
                    ...answer,
                    isCorrect: e.target.checked,
                  };
                  change_question(
                    {
                      ...question,
                      answers: question.answers.map((a) =>
                        a.id === answer.id ? updated_answer : a
                      ),
                    },
                    questionSets,
                    setExam
                  );
                }}
              >
                Correct
              </Checkbox>
              <IconButton
                aria-label="Remove answer"
                icon={<X size={16} />}
                size="xs"
                colorScheme="red"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  change_question(
                    {
                      ...question,
                      answers: question.answers.filter(
                        (a) => a.id !== answer.id
                      ),
                    },
                    questionSets,
                    setExam
                  );
                }}
              />
            </HStack>
          </Box>
        ))}
        <HStack>
          <Button
            leftIcon={<Plus size={16} />}
            colorScheme="teal"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              change_question(
                {
                  ...question,
                  answers: [...question.answers, default_question_answer()],
                },
                questionSets,
                setExam
              );
            }}
          >
            Add Answer
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}

type DialogueFormProps = {
  questionSet: ExamEnvironmentQuestionSet;
  questionSets: ExamEnvironmentQuestionSet[];
  setExam: (partialExam: Partial<ExamCreatorExam>) => void;
  stagingExams: ExamEnvironmentGeneratedExam[] | undefined;
  productionExams: ExamEnvironmentGeneratedExam[] | undefined;
  isLoading: boolean;
  hasGeneratedExams: boolean;
};

export function DialogueForm({
  questionSet,
  questionSets,
  setExam,
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
              setExam
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
            setExam({
              questionSets: questionSets.filter(
                (qt) => qt.id !== questionSet.id
              ),
            });
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
                setExam={setExam}
                borderColor={questionBorderStyle.borderColor}
                borderStyle={questionBorderStyle.borderStyle}
                borderWidth={questionBorderStyle.borderWidth}
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
              setExam
            );
          }}
        >
          Add Question to Dialogue
        </Button>
      </Stack>
    </Box>
  );
}

function getQuestionStatus(
  questionId: string,
  stagingExams: ExamEnvironmentGeneratedExam[] | undefined,
  productionExams: ExamEnvironmentGeneratedExam[] | undefined
): QuestionStatus {
  const stagingCount =
    stagingExams?.filter((exam) =>
      exam.questionSets.some((qs) =>
        qs.questions.some((q) => q.id === questionId)
      )
    ).length ?? 0;

  const productionCount =
    productionExams?.filter((exam) =>
      exam.questionSets.some((qs) =>
        qs.questions.some((q) => q.id === questionId)
      )
    ).length ?? 0;

  return {
    inStaging: stagingCount > 0,
    inProduction: productionCount > 0,
    stagingCount,
    productionCount,
    totalCount: Math.max(stagingCount, productionCount),
  };
}

function getQuestionSetStatus(
  questionSetId: string,
  stagingExams: ExamEnvironmentGeneratedExam[] | undefined,
  productionExams: ExamEnvironmentGeneratedExam[] | undefined
): QuestionSetStatus {
  const stagingCount =
    stagingExams?.filter((exam) =>
      exam.questionSets.some((qs) => qs.id === questionSetId)
    ).length ?? 0;

  const productionCount =
    productionExams?.filter((exam) =>
      exam.questionSets.some((qs) => qs.id === questionSetId)
    ).length ?? 0;

  return {
    inStaging: stagingCount > 0,
    inProduction: productionCount > 0,
    stagingCount,
    productionCount,
    totalCount: Math.max(stagingCount, productionCount),
  };
}

function getBorderStyle(
  status: QuestionStatus,
  isLoading: boolean,
  hasGeneratedExams: boolean
): {
  borderColor: string;
  borderStyle: string;
  borderWidth: string;
  generationCount?: number;
  isLoading: boolean;
} {
  if (isLoading) {
    return {
      borderColor: "blue.400",
      borderStyle: "dashed",
      borderWidth: "3px",
      isLoading: true,
    };
  }

  if (status.inProduction) {
    return {
      borderColor: "green.400",
      borderStyle: "solid",
      borderWidth: "3px",
      generationCount: status.productionCount,
      isLoading: false,
    };
  }

  if (status.inStaging) {
    return {
      borderColor: "yellow.400",
      borderStyle: "solid",
      borderWidth: "3px",
      generationCount: status.stagingCount,
      isLoading: false,
    };
  }

  if (hasGeneratedExams) {
    return {
      borderColor: "red.400",
      borderStyle: "solid",
      borderWidth: "3px",
      isLoading: false,
    };
  }

  return {
    borderColor: "gray.700",
    borderStyle: "solid",
    borderWidth: "1px",
    isLoading: false,
  };
}

type QuestionFormProps = {
  searchIds: string[];
  questionSets: ExamEnvironmentQuestionSet[];
  setExam: (partialExam: Partial<ExamCreatorExam>) => void;
  generatedExamsStagingQuery: any;
  generatedExamsProductionQuery: any;
};

export function QuestionForm({
  searchIds,
  questionSets,
  setExam,
  generatedExamsStagingQuery,
  generatedExamsProductionQuery,
}: QuestionFormProps) {
  const cardBg = useColorModeValue("gray.800", "gray.800");

  const isLoading =
    generatedExamsStagingQuery.isPending ||
    generatedExamsProductionQuery.isPending;

  const stagingExams = generatedExamsStagingQuery.data;
  const productionExams = generatedExamsProductionQuery.data;

  const hasGeneratedExams = useMemo(() => {
    return (
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
                  setExam({
                    questionSets: questionSets.filter((q) => q.id !== qt.id),
                  });
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
                      setExam={setExam}
                      borderColor={questionBorderStyle.borderColor}
                      borderStyle={questionBorderStyle.borderStyle}
                      borderWidth={questionBorderStyle.borderWidth}
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
                      setExam={setExam}
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
              setExam({
                questionSets: [
                  ...questionSets,
                  new_question_type("MultipleChoice"),
                ],
              });
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
              setExam({
                questionSets: [...questionSets, new_question_type("Dialogue")],
              });
            }}
          >
            Add Dialogue Question
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}
