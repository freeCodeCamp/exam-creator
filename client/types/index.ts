import type { EnvExam } from "@prisma/client";

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
  exam: null | EnvExam["id"];
  lastActive: number; // Timestamp in milliseconds
}

export interface ClientSync {
  users: User[];
  exams: EnvExam[];
}

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
