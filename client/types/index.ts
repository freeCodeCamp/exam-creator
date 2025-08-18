import type {
  ExamCreatorExam,
  ExamEnvironmentExamAttempt,
  ExamEnvironmentMultipleChoiceQuestion,
  ExamEnvironmentMultipleChoiceQuestionAttempt,
  ExamEnvironmentQuestionSet,
} from "@prisma/client";

export interface User {
  name: string;
  email: string;
  picture: string;
  activity: Activity;
}

export interface SessionUser extends User {
  webSocketToken: string;
}

export interface Activity {
  page: URL;
  lastActive: number; // Timestamp in milliseconds
}

export interface ClientSync {
  users: User[];
  exams: ExamCreatorExam[];
}

type AttemptQuestion = ExamEnvironmentMultipleChoiceQuestion & {
  selected: ExamEnvironmentMultipleChoiceQuestionAttempt["answers"];
  submissionTime: ExamEnvironmentMultipleChoiceQuestionAttempt["submissionTimeInMS"];
};
type AttemptQuestionSet = ExamEnvironmentQuestionSet & {
  questions: Array<AttemptQuestion>;
};
export type Attempt = ExamCreatorExam &
  ExamEnvironmentExamAttempt & {
    questionSets: Array<AttemptQuestionSet>;
  };

// Replace all levels of `id` with _id: { $oid: string }
// type OmitId<T> = {
//   [K in keyof T]: K extends "id"
//     ? { _id: { $oid: string } }
//     : T[K] extends Array<infer U>
//     ? OmitId<U>[]
//     : T[K] extends object
//     ? OmitId<T[K]>
//     : T[K];
// };

// export type Exam = OmitId<EnvExam>;
