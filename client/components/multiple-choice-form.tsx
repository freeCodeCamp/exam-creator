import { useEffect, useRef, useState } from "react";
import {
  type ExamEnvironmentMultipleChoiceQuestion,
  type ExamEnvironmentQuestionSet,
  type ExamEnvironmentGeneratedExam,
} from "@prisma/client";
import {
  Box,
  Button,
  Input,
  Textarea,
  Checkbox,
  Field,
  HStack,
  Stack,
  Text,
  IconButton,
  Heading,
} from "@chakra-ui/react";
import { Plus, X } from "lucide-react";

import {
  change_question,
  change_question_type,
  default_question_answer,
  default_question_audio,
  getAnswerStatus,
  getBorderStyle,
  parseMarkdown,
  remove_question,
} from "../utils/question";

type MultipleChoiceFormProps = {
  question: ExamEnvironmentMultipleChoiceQuestion;
  questionSet: ExamEnvironmentQuestionSet;
  questionSets: ExamEnvironmentQuestionSet[];
  setQuestionSets: (qs: ExamEnvironmentQuestionSet[]) => void;
  borderColor?: string;
  borderStyle?: string;
  borderWidth?: string;
  stagingExams?: ExamEnvironmentGeneratedExam[] | undefined;
  productionExams?: ExamEnvironmentGeneratedExam[] | undefined;
  isLoading?: boolean;
  hasGeneratedExams?: boolean;
};

export function MultipleChoiceForm({
  question,
  questionSet,
  questionSets,
  setQuestionSets,
  borderColor = "gray.700",
  borderStyle = "solid",
  borderWidth = "1px",
  stagingExams,
  productionExams,
  isLoading = false,
  hasGeneratedExams = false,
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
      { threshold: 0.1 },
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

  return (
    <Box
      borderRadius="lg"
      p={2}
      borderWidth={borderWidth}
      borderColor={borderColor}
      borderStyle={borderStyle}
    >
      <Text fontWeight="bold" mb={2} id={question.id}>
        Multiple Choice Form
      </Text>
      <Stack gap={3}>
        <Checkbox.Root
          checked={question.deprecated}
          onCheckedChange={(d) => {
            change_question(
              {
                ...question,
                deprecated: !!d.checked,
              },
              questionSets,
              setQuestionSets,
            );
          }}
          alignSelf="flex-end"
          colorPalette="red"
        >
          <Checkbox.Control />
          <Checkbox.Label>Deprecated</Checkbox.Label>
        </Checkbox.Root>
        <Field.Root>
          <Field.Label>Context</Field.Label>
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
                setQuestionSets,
              )
            }
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Question</Field.Label>
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
                setQuestionSets,
              );
            }}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Tags</Field.Label>
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
                setQuestionSets,
              );
            }}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Audio URL</Field.Label>
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
                setQuestionSets,
              );
            }}
          />
        </Field.Root>
        {question.audio?.url && isAudioVisible && (
          <Box borderRadius="md" p={2} mt={2}>
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
              setQuestionSets,
            );
          }}
        />
        <Button
          colorPalette="red"
          borderColor="red.400"
          borderWidth={1}
          variant="ghost"
          size="sm"
          alignSelf="flex-start"
          onClick={(e) => {
            e.preventDefault();
            remove_question(question, questionSets, setQuestionSets);
          }}
        >
          <X size={16} />
          Remove Question
        </Button>
        <Heading size="lg" fontWeight="bold" mt={4}>
          Answers
        </Heading>
        {question.answers.map((answer) => {
          const answerStatus = getAnswerStatus(
            answer.id,
            stagingExams,
            productionExams,
          );
          const answerBorderStyle = getBorderStyle(
            answerStatus,
            isLoading,
            hasGeneratedExams,
          );

          return (
            <Box
              key={answer.id}
              p={2}
              bg="bg.muted"
              borderRadius="md"
              position="relative"
              borderWidth={
                answerBorderStyle.dualBorder
                  ? "0"
                  : answerBorderStyle.borderWidth
              }
              borderColor={answerBorderStyle.borderColor}
              borderStyle={answerBorderStyle.borderStyle}
              css={
                answerBorderStyle.dualBorder
                  ? {
                      boxShadow: `0 0 0 2px #ECC94B, 0 0 0 4px #48BB78`,
                    }
                  : undefined
              }
            >
              {answerBorderStyle.dualBorder &&
              answerBorderStyle.stagingCount !== undefined &&
              answerBorderStyle.productionCount !== undefined ? (
                <HStack
                  position="absolute"
                  top="-8px"
                  right="8px"
                  gap={1}
                  zIndex={1}
                >
                  <Box
                    bg="yellow.500"
                    color="white"
                    fontSize="xs"
                    px={1.5}
                    py={0.5}
                    borderRadius="md"
                    fontWeight="bold"
                  >
                    S:{answerBorderStyle.stagingCount}
                  </Box>
                  <Box
                    bg="green.500"
                    color="white"
                    fontSize="xs"
                    px={1.5}
                    py={0.5}
                    borderRadius="md"
                    fontWeight="bold"
                  >
                    P:{answerBorderStyle.productionCount}
                  </Box>
                </HStack>
              ) : answerBorderStyle.generationCount !== undefined &&
                answerBorderStyle.generationCount > 0 ? (
                <Box
                  position="absolute"
                  top="-8px"
                  right="8px"
                  bg={
                    answerBorderStyle.borderColor === "green.400"
                      ? "green.500"
                      : answerBorderStyle.borderColor === "yellow.400"
                        ? "yellow.500"
                        : "red.500"
                  }
                  color="white"
                  fontSize="xs"
                  px={2}
                  py={0.5}
                  borderRadius="md"
                  fontWeight="bold"
                >
                  {answerBorderStyle.generationCount}
                </Box>
              ) : null}
              <Box
                className="answer-markdown"
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
                        a.id === answer.id ? updated_answer : a,
                      ),
                    },
                    questionSets,
                    setQuestionSets,
                  );
                }}
                mb={2}
              />
              <HStack justify="space-between">
                <Checkbox.Root
                  colorPalette="teal"
                  checked={answer.isCorrect}
                  onCheckedChange={(d) => {
                    const updated_answer = {
                      ...answer,
                      isCorrect: !!d.checked,
                    };
                    change_question(
                      {
                        ...question,
                        answers: question.answers.map((a) =>
                          a.id === answer.id ? updated_answer : a,
                        ),
                      },
                      questionSets,
                      setQuestionSets,
                    );
                  }}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Correct</Checkbox.Label>
                </Checkbox.Root>
                <IconButton
                  aria-label="Remove answer"
                  size="xs"
                  colorPalette="red"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    change_question(
                      {
                        ...question,
                        answers: question.answers.filter(
                          (a) => a.id !== answer.id,
                        ),
                      },
                      questionSets,
                      setQuestionSets,
                    );
                  }}
                >
                  <X size={16} />
                </IconButton>
              </HStack>
            </Box>
          );
        })}
        <HStack>
          <Button
            colorPalette="teal"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              change_question(
                {
                  ...question,
                  answers: [...question.answers, default_question_answer()],
                },
                questionSets,
                setQuestionSets,
              );
            }}
          >
            <Plus size={16} />
            Add Answer
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}
