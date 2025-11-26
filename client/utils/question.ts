import type {
  ExamEnvironmentAnswer,
  ExamEnvironmentGeneratedExam,
  ExamEnvironmentMultipleChoiceQuestion,
  ExamEnvironmentQuestionSet,
  ExamEnvironmentQuestionType,
} from "@prisma/client";
import { marked } from "marked";
import { ObjectId } from "bson";
import { markedHighlight } from "marked-highlight";
import Prism from "prismjs";
import { getGenerations } from "./fetch";
import { QuestionSetStatus, QuestionStatus } from "../types";

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
  setQuestionSets: (qs: ExamEnvironmentQuestionSet[]) => void
) {
  setQuestionSets(
    questionSets.map((qt) =>
      qt.id === updatedQuestionSet.id ? updatedQuestionSet : qt
    )
  );
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
  setQuestionSets: (qs: ExamEnvironmentQuestionSet[]) => void
) {
  setQuestionSets(
    questionSets.map((qt) => ({
      ...qt,
      questions: qt.questions.map((q) =>
        q.id === updated_question.id ? updated_question : q
      ),
    }))
  );
}

export function remove_question(
  question: ExamEnvironmentMultipleChoiceQuestion,
  questionSets: ExamEnvironmentQuestionSet[],
  setQuestionSets: (qs: ExamEnvironmentQuestionSet[]) => void
) {
  // If question is only in question_type, remove question_type
  const question_type = questionSets.find((qt) =>
    qt.questions.some((q) => q.id === question.id)
  );
  if (question_type?.questions.length === 1) {
    setQuestionSets(questionSets.filter((qt) => qt.id !== question_type.id));
    return;
  }

  setQuestionSets(
    questionSets.map((qt) => ({
      ...qt,
      questions: qt.questions.filter((q) => q.id !== question.id),
    }))
  );
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

export function getAnswerStatus(
  answerId: string,
  stagingExams: ExamEnvironmentGeneratedExam[] | undefined,
  productionExams: ExamEnvironmentGeneratedExam[] | undefined
): QuestionStatus {
  const stagingCount =
    stagingExams?.filter?.((exam) =>
      exam.questionSets.some((qs) =>
        qs.questions.some((q) => q.answers.some((a) => a === answerId))
      )
    )?.length ?? 0;

  const productionCount =
    productionExams?.filter?.((exam) =>
      exam.questionSets.some((qs) =>
        qs.questions.some((q) => q.answers.some((a) => a === answerId))
      )
    )?.length ?? 0;

  return {
    inStaging: stagingCount > 0,
    inProduction: productionCount > 0,
    stagingCount,
    productionCount,
    totalCount: Math.max(stagingCount, productionCount),
  };
}

export function getQuestionStatus(
  questionId: string,
  stagingExams: ExamEnvironmentGeneratedExam[] | undefined,
  productionExams: ExamEnvironmentGeneratedExam[] | undefined
): QuestionStatus {
  const stagingCount =
    stagingExams?.filter?.((exam) =>
      exam.questionSets.some((qs) =>
        qs.questions.some((q) => q.id === questionId)
      )
    )?.length ?? 0;

  const productionCount =
    productionExams?.filter?.((exam) =>
      exam.questionSets.some((qs) =>
        qs.questions.some((q) => q.id === questionId)
      )
    )?.length ?? 0;

  return {
    inStaging: stagingCount > 0,
    inProduction: productionCount > 0,
    stagingCount,
    productionCount,
    totalCount: Math.max(stagingCount, productionCount),
  };
}

export function getQuestionSetStatus(
  questionSetId: string,
  stagingExams: ExamEnvironmentGeneratedExam[] | undefined,
  productionExams: ExamEnvironmentGeneratedExam[] | undefined
): QuestionSetStatus {
  const stagingCount =
    stagingExams?.filter?.((exam) =>
      exam.questionSets.some((qs) => qs.id === questionSetId)
    )?.length ?? 0;

  const productionCount =
    productionExams?.filter?.((exam) =>
      exam.questionSets.some((qs) => qs.id === questionSetId)
    )?.length ?? 0;

  return {
    inStaging: stagingCount > 0,
    inProduction: productionCount > 0,
    stagingCount,
    productionCount,
    totalCount: Math.max(stagingCount, productionCount),
  };
}

export function getBorderStyle(
  status: QuestionStatus,
  isLoading: boolean,
  hasGeneratedExams: boolean
): {
  borderColor: string;
  borderStyle: string;
  borderWidth: string;
  generationCount?: number;
  isLoading: boolean;
  dualBorder?: boolean;
  stagingCount?: number;
  productionCount?: number;
} {
  if (isLoading) {
    return {
      borderColor: "blue.400",
      borderStyle: "dashed",
      borderWidth: "3px",
      isLoading: true,
    };
  }

  if (status.inProduction && status.inStaging) {
    return {
      borderColor: "green.400",
      borderStyle: "solid",
      borderWidth: "3px",
      generationCount: status.productionCount + status.stagingCount,
      isLoading: false,
      dualBorder: true,
      stagingCount: status.stagingCount,
      productionCount: status.productionCount,
    };
  }

  if (status.inProduction) {
    return {
      borderColor: "green.400",
      borderStyle: "solid",
      borderWidth: "3px",
      generationCount: status.productionCount,
      isLoading: false,
      productionCount: status.productionCount,
    };
  }

  if (status.inStaging) {
    return {
      borderColor: "yellow.400",
      borderStyle: "solid",
      borderWidth: "3px",
      generationCount: status.stagingCount,
      isLoading: false,
      stagingCount: status.stagingCount,
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

// Converts to HH:MM:SS format
export function secondsToHumanReadable(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
