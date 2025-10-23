import type {
  ExamCreatorExam,
  ExamCreatorUser,
  ExamEnvironmentExamAttempt,
  ExamEnvironmentMultipleChoiceQuestion,
  ExamEnvironmentMultipleChoiceQuestionAttempt,
  ExamEnvironmentQuestionSet,
} from "@prisma/client";

export interface User
  extends Omit<ExamCreatorUser, "id" | "github_id" | "version"> {
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

export interface Settings {
  databaseEnvironment: "Production" | "Staging";
}

export type Attempt = Omit<ExamCreatorExam, "questionSets"> & {
  questionSets: Array<
    Omit<ExamEnvironmentQuestionSet, "questions"> & {
      questions: Array<
        ExamEnvironmentMultipleChoiceQuestion &
          Omit<ExamEnvironmentMultipleChoiceQuestionAttempt, "answers"> & {
            selected: ExamEnvironmentMultipleChoiceQuestionAttempt["answers"];
          }
      >;
    }
  >;
} & Omit<ExamEnvironmentExamAttempt, "questionSets">;

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

export type QuestionStatus = {
  inStaging: boolean;
  inProduction: boolean;
  stagingCount: number;
  productionCount: number;
  totalCount: number;
};

export type QuestionSetStatus = QuestionStatus;
