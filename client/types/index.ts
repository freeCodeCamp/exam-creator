import type {
  EnvExam,
  EnvExamAttempt,
  EnvMultipleChoiceQuestion,
  EnvMultipleChoiceQuestionAttempt,
  EnvQuestionSet,
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
  exams: EnvExam[];
}

type AttemptQuestion = EnvMultipleChoiceQuestion & {
  selected: EnvMultipleChoiceQuestionAttempt["answers"];
  submissionTime: EnvMultipleChoiceQuestionAttempt["submissionTimeInMS"];
};
type AttemptQuestionSet = EnvQuestionSet & {
  questions: Array<AttemptQuestion>;
};
export type Attempt = EnvExam &
  EnvExamAttempt & {
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
