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
import { getGenerations } from "./fetch";

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

export function compare<T, U>(arr: T[], cb: (a: T, b: T) => U): U[] {
  const results: U[] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      results.push(cb(arr[i], arr[j]));
    }
  }

  return results;
}

export function calculateGenerationMetrics(
  generatedExams: Awaited<ReturnType<typeof getGenerations>> | undefined
) {
  if (!generatedExams || generatedExams.length === 0) {
    return {
      totalGenerations: 0,
      questionVariability: "-",
      questionVariabilityMax: "-",
      questionVariabilityMin: "-",
      answerVariability: "-",
      answerVariabilityMax: "-",
      answerVariabilityMin: "-",
    };
  }

  const totalGenerations = generatedExams.length;

  // Variability is considered: (number of different) / (total)
  // For final variability, it is: (sum of variabilities) / (number of comparisons)

  // Compare all generations to each other to find variability
  // - Compare A to B, A to C, and B to C
  const questions = generatedExams.map((gen) =>
    gen.questionSets.flatMap((qs) => qs.questions)
  );
  let questionVariability = 0;
  let questionVariabilityMax = 0;
  let questionVariabilityMin = 1;
  // questions: [[1,2,3],[1,2,4]] | [[1,2,3], [4,5,6]]
  const questionVariabilities: number[] = compare(questions, (a, b) => {
    if (a.length !== b.length) {
      console.error("Generations have different number of questions", a, b);
    }
    // uniqueQuestions: [1,2,3,4] | [1,2,3,4,5,6]
    const uniqueQuestions = [];
    for (const q of a) {
      uniqueQuestions.push(q.id);
    }
    for (const q of b) {
      if (!uniqueQuestions.includes(q.id)) {
        uniqueQuestions.push(q.id);
      }
    }
    // v: (4 - 3) / 3 = 0.333 | (6 - 3) / 3 = 1
    // v: (unique questions) / (total questions per generation)
    const v = (uniqueQuestions.length - a.length) / a.length;
    questionVariability += v;
    if (v > questionVariabilityMax) {
      questionVariabilityMax = v;
    }
    if (v < questionVariabilityMin) {
      questionVariabilityMin = v;
    }
    return v;
  });
  questionVariability =
    questionVariabilities.length > 0
      ? questionVariability / questionVariabilities.length
      : 0;

  const answers = generatedExams.map((gen) =>
    gen.questionSets.flatMap((qs) => qs.questions).flatMap((q) => q.answers)
  );
  let answerVariability = 0;
  let answerVariabilityMax = 0;
  let answerVariabilityMin = 1;
  const answerVariabilities: number[] = compare(answers, (a, b) => {
    const uniqueAnswers = [];
    for (const q of a) {
      uniqueAnswers.push(q);
    }
    for (const q of b) {
      if (!uniqueAnswers.includes(q)) {
        uniqueAnswers.push(q);
      }
    }
    const v = (uniqueAnswers.length - a.length) / a.length;
    answerVariability += v;
    if (v > answerVariabilityMax) {
      answerVariabilityMax = v;
    }
    if (v < answerVariabilityMin) {
      answerVariabilityMin = v;
    }
    return v;
  });
  answerVariability =
    answerVariabilities.length > 0
      ? answerVariability / answerVariabilities.length
      : 0;

  return {
    totalGenerations,
    questionVariability: questionVariability.toFixed(3),
    questionVariabilityMax: questionVariabilityMax.toFixed(3),
    questionVariabilityMin: questionVariabilityMin.toFixed(3),
    answerVariability: answerVariability.toFixed(3),
    answerVariabilityMax: answerVariabilityMax.toFixed(3),
    answerVariabilityMin: answerVariabilityMin.toFixed(3),
  };
}
