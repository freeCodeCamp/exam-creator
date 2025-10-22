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

export function analyzeVariability(xs: number[]) {
  let mean = 0;
  let max = 0;
  let min = 1;
  for (const x of xs) {
    mean += x;
    if (x > max) max = x;
    if (x < min) min = x;
  }
  mean = xs.length > 0 ? mean / xs.length : 0;

  return {
    mean,
    max,
    min,
  };
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

  const questionIds = questions.map((qs) => qs.map((q) => q.id));

  // questions: [[1,2,3],[1,2,4]] | [[1,2,3], [4,5,6]]
  const {
    mean: questionVariability,
    max: questionVariabilityMax,
    min: questionVariabilityMin,
  } = analyzeVariability(findVariabilities(questionIds));

  const answers = generatedExams.map((gen) =>
    gen.questionSets.flatMap((qs) => qs.questions).flatMap((q) => q.answers)
  );

  const {
    mean: answerVariability,
    max: answerVariabilityMax,
    min: answerVariabilityMin,
  } = analyzeVariability(findVariabilities(answers));

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

export function findVariabilities(idArrays: string[][]) {
  return compare(idArrays, (arr1, arr2) => {
    if (arr1.length !== arr2.length) {
      console.error(
        "Generations have different number of questions",
        arr1,
        arr2
      );
    }

    // Of the various ways to calculate variability, this performs much better
    // for sets of ~50 items. Other options, e.g Set.difference, arr1.filter(x
    // => !arr2.includes(x)) and building arrays of unique items, were much
    // slower.
    const unique = new Set(arr1);
    for (const id of arr2) {
      unique.delete(id);
    }
    return unique.size / arr1.length;
  });
}
