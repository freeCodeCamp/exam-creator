import type {
  ExamEnvironmentAnswer,
  ExamCreatorExam,
  ExamEnvironmentMultipleChoiceQuestion,
  ExamEnvironmentQuestionSet,
  ExamEnvironmentQuestionType,
} from "@prisma/client";
import { marked } from "marked";
import { ObjectId } from "bson";
import { markedHighlight } from "marked-highlight";
import Prism from "prismjs";

export function new_question_type(
  t: ExamEnvironmentQuestionType
): ExamEnvironmentQuestionSet {
  return {
    id: new ObjectId().toString(),
    type: t,
    context: "",
    questions: [defaultQuestion()],
  };
}
export function defaultQuestion(): ExamEnvironmentMultipleChoiceQuestion {
  return {
    id: new ObjectId().toString(),
    text: "",
    tags: [],
    audio: null,
    answers: [],
    deprecated: false,
  };
}

export function change_question_type(
  updatedQuestionSet: ExamEnvironmentQuestionSet,
  questionSets: ExamEnvironmentQuestionSet[],
  setExam: (partialExam: Partial<ExamCreatorExam>) => void
) {
  setExam({
    questionSets: questionSets.map((qt) =>
      qt.id === updatedQuestionSet.id ? updatedQuestionSet : qt
    ),
  });
}
export function default_question_audio(): NonNullable<
  ExamEnvironmentMultipleChoiceQuestion["audio"]
> {
  return {
    url: "",
    captions: null,
  };
}

export function change_question(
  updated_question: ExamEnvironmentMultipleChoiceQuestion,
  questionSets: ExamEnvironmentQuestionSet[],
  setExam: (partialExam: Partial<ExamCreatorExam>) => void
) {
  setExam({
    questionSets: questionSets.map((qt) => ({
      ...qt,
      questions: qt.questions.map((q) =>
        q.id === updated_question.id ? updated_question : q
      ),
    })),
  });
}

export function remove_question(
  question: ExamEnvironmentMultipleChoiceQuestion,
  questionSets: ExamEnvironmentQuestionSet[],
  setExam: (partialExam: Partial<ExamCreatorExam>) => void
) {
  // If question is only in question_type, remove question_type
  const question_type = questionSets.find((qt) =>
    qt.questions.some((q) => q.id === question.id)
  );
  if (question_type?.questions.length === 1) {
    setExam({
      questionSets: questionSets.filter((qt) => qt.id !== question_type.id),
    });
    return;
  }

  setExam({
    questionSets: questionSets.map((qt) => ({
      ...qt,
      questions: qt.questions.filter((q) => q.id !== question.id),
    })),
  });
}

export function default_question_answer(): ExamEnvironmentAnswer {
  return {
    id: new ObjectId().toString(),
    text: "",
    isCorrect: false,
  };
}

export function default_question(): ExamEnvironmentMultipleChoiceQuestion {
  return {
    id: new ObjectId().toString(),
    text: "",
    tags: [],
    audio: null,
    answers: [],
    deprecated: false,
  };
}

marked.use(
  markedHighlight({
    highlight: (code, lang) => {
      if (lang && Prism.languages[lang]) {
        return Prism.highlight(code, Prism.languages[lang], String(lang));
      } else {
        return code;
      }
    },
  })
);

export function parseMarkdown(markdown: unknown): string {
  switch (typeof markdown) {
    case "undefined":
      console.error("received undefined markdown");
      return "undefined";
    case "object":
      console.error("received object instead of string markdown", markdown);
      const repr = JSON.stringify(markdown);
      return marked.parse(repr, { async: false, gfm: true });
    case "boolean":
      console.warn("received boolean instead of string markdown", markdown);
      return markdown ? "true" : "false";
    case "number":
      console.warn("received number instead of string markdown", markdown);
      return markdown.toString();
    case "string":
      return marked.parse(markdown, { async: false, gfm: true });
    default:
      console.error("received unknown type of markdown", markdown);
      return "unknown";
  }
}
