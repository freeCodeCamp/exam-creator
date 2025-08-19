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
      // Use the global Prism instance loaded by the script tag
      const Prism = window.Prism;

      if (Prism && lang && Prism.languages[lang]) {
        return Prism.highlight(code, Prism.languages[lang], String(lang));
      } else {
        return code;
      }
    },
  })
);

export function parseMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true });
}
