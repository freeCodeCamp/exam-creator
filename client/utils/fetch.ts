import {
  type ExamCreatorExam,
  type ExamEnvironmentChallenge,
  type ExamEnvironmentExamAttempt,
  type ExamEnvironmentExamModeration,
  type ExamEnvironmentExamModerationStatus,
  type ExamEnvironmentGeneratedExam,
} from "@prisma/client";
import type {
  Attempt,
  ClientSync,
  Event,
  SessionUser,
  Settings,
  User,
} from "../types";
import { deserializeToPrisma, serializeFromPrisma } from "./serde";

async function authorizedFetch(
  url: string | URL,
  options?: RequestInit,
): Promise<Response> {
  const headers = {
    ...options?.headers,
  };

  const res = await fetch(url, {
    ...{ ...options, credentials: "include" },
    headers,
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.debug(res.status, url, errorData);
    if (res.status === 401) {
      throw new Error(`${errorData}: Log out, then try again.`);
    }

    throw new Error(`${res.status} - ${errorData || res.statusText}`);
  }

  return res;
}

export async function discardExamStateById(
  examId: ExamCreatorExam["id"],
): Promise<ExamCreatorExam> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const exam = await getExamById(examId);
    return exam;
  }

  const res = await authorizedFetch(`/state/exams/${examId}`, {
    method: "PUT",
  });
  const json = await res.json();
  const deserialized = deserializeToPrisma<ExamCreatorExam>(json);
  return deserialized;
}

// Update the state on the server
export async function putState(state: ClientSync): Promise<ClientSync> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    return state;
  }

  const res = await authorizedFetch("/api/state", {
    method: "PUT",
    body: JSON.stringify(serializeFromPrisma(state)),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  const deserialized = deserializeToPrisma<ClientSync>(json);
  return deserialized;
}

export type GetExam = {
  exam: Omit<ExamCreatorExam, "questionSets">;
  databaseEnvironments: ("Staging" | "Production")[];
};

export async function getExams(): Promise<GetExam[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const res = await fetch("/mocks/exams.json");
    if (!res.ok) {
      throw new Error(
        `Failed to load mock exams: ${res.status} - ${res.statusText}`,
      );
    }
    const exams: GetExam[] = deserializeToPrisma(await res.json());
    return exams;
  }

  const res = await authorizedFetch("/api/exams");
  const json = await res.json();
  const deserialized = deserializeToPrisma<GetExam[]>(json);
  return deserialized;
}

export async function getExamById(examId: string): Promise<ExamCreatorExam> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const res = await fetch(`/mocks/api/exams/${examId}.json`);
    if (!res.ok) {
      throw new Error(
        `Failed to load mock exam: ${res.status} - ${res.statusText}`,
      );
    }
    const exam: ExamCreatorExam = deserializeToPrisma(await res.json());
    return exam;
  }

  const res = await authorizedFetch(`/api/exams/${examId}`);
  const json = await res.json();
  const deserialized = deserializeToPrisma<ExamCreatorExam>(json);
  return deserialized;
}

/**
 * Updates an existing exam by its ID
 * @param exam The full exam to overwrite the existing one.
 * @returns
 */
export async function putExamById(
  exam: ExamCreatorExam,
): Promise<ExamCreatorExam> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    return exam;
  }

  const res = await authorizedFetch(`/api/exams/${exam.id}`, {
    method: "PUT",
    body: JSON.stringify(serializeFromPrisma(exam)),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  const deserialized = deserializeToPrisma<ExamCreatorExam>(json);
  return deserialized;
}

/**
 * Server creates a new exam
 */
export async function postExam(): Promise<ExamCreatorExam> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const exam = await fetch("/mocks/exam.json");

    if (!exam.ok) {
      throw new Error(
        `Failed to load mock exam: ${exam.status} - ${exam.statusText}`,
      );
    }

    const examData = await exam.json();

    return deserializeToPrisma(examData);
  }

  const res = await authorizedFetch("/api/exams", {
    method: "POST",
  });
  const json = await res.json();
  const deserialized = deserializeToPrisma<ExamCreatorExam>(json);
  return deserialized;
}

interface GetGenerationsArg {
  examId: ExamCreatorExam["id"];
  databaseEnvironment: "Staging" | "Production";
}

export async function getGenerations({
  examId,
  databaseEnvironment,
}: GetGenerationsArg): Promise<ExamEnvironmentGeneratedExam[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const res = await fetch(
      `/mocks/api/exams/${examId}/generations/${databaseEnvironment.toLowerCase()}.json`,
    );

    if (!res.ok) {
      // Exams without a generations mock file have no generations
      return [];
    }

    const generations: ExamEnvironmentGeneratedExam[] = await res.json();
    return deserializeToPrisma(generations);
  }

  const res = await authorizedFetch(
    `/api/exams/${examId}/generations/${databaseEnvironment}`,
  );
  const json = await res.json();
  return deserializeToPrisma(json);
}

export interface PutGenerateExam {
  examId: ExamCreatorExam["id"];
  count: number;
  databaseEnvironment: "Staging" | "Production";
}

/**
 * Generate an exam based on the exam configuration
 */
export async function putGenerateExam({
  examId,
  count,
  databaseEnvironment,
}: PutGenerateExam): Promise<ReadableStream<Uint8Array<ArrayBuffer>>> {
  // }: PutGenerateExam): Promise<ReadableStream<Uint8Array>> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const generatedExam = {
      examId,
      count,
    };

    // Mock readable stream with delayed chunks of two `generatedExam` objects. This should return a JSON New Line stream
    return new ReadableStream<Uint8Array<ArrayBuffer>>({
      start(controller) {
        let sent = 0;
        const interval = setInterval(() => {
          if (sent < count) {
            controller.enqueue(
              new TextEncoder().encode(
                JSON.stringify(generatedExam) + (sent < count - 1 ? "\n" : ""),
              ),
            );
            sent++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 500);
      },
    });
  }

  const res = await authorizedFetch(
    `/api/exams/${examId}/generations/${databaseEnvironment}`,
    {
      method: "PUT",
      body: JSON.stringify({ count }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.body) {
    throw new Error("Failed to generate exam");
  }

  return res.body;
}

export async function postValidateConfigByExamId(
  examId: ExamCreatorExam["id"],
): Promise<Response> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    return new Response();
  }

  const res = await authorizedFetch(`/api/exams/${examId}/config/validate`, {
    method: "POST",
  });

  return res;
}

export async function getUsers(): Promise<User[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const users: User[] = [
      {
        name: "Camper Bot",
        email: "camperbot@freecodecamp.org",
        picture: "https://avatars.githubusercontent.com/u/13561988?v=4",
        activity: {
          page: new URL(window.location.href),
          lastActive: Date.now(),
        },
        settings: {
          databaseEnvironment: "Staging",
        },
      },
      {
        name: "Quincy Larson",
        email: "quincy@freecodecamp.org",
        picture: "https://avatars.githubusercontent.com/u/985197?v=4",
        activity: {
          page: new URL("/exams", window.location.origin),
          lastActive: Date.now() - 30_000,
        },
        settings: {
          databaseEnvironment: "Production",
        },
      },
    ];
    const res = new Response(JSON.stringify(users));
    return res.json();
  }

  const res = await authorizedFetch("/api/users");
  const json = await res.json();
  const deserialized = deserializeToPrisma<User[]>(json);
  return deserialized;
}

export async function getSessionUser(): Promise<SessionUser> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const user: SessionUser = {
      name: "Camper Bot",
      email: "camperbot@freecodecamp.org",
      picture: "https://avatars.githubusercontent.com/u/13561988?v=4",
      activity: {
        lastActive: Date.now(),
        page: new URL(window.location.href),
      },
      webSocketToken: "",
      settings: {
        databaseEnvironment: "Staging",
      },
    };
    const res = new Response(JSON.stringify(user));
    return res.json();
  }

  const res = await authorizedFetch("/api/users/session");
  const json = await res.json();
  // TODO: This breaks { settings: Settings } in User
  // const deserialized = deserializeToPrisma<SessionUser>(json);
  // return deserialized;
  return json;
}

export async function putUserSettings(
  newSettings: Settings,
): Promise<Settings> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const settings: Settings = {
      databaseEnvironment: newSettings.databaseEnvironment,
    };
    return settings;
  }

  const res = await authorizedFetch(`/api/users/session/settings`, {
    method: "PUT",
    body: JSON.stringify(serializeFromPrisma(newSettings)),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  const deserialized = deserializeToPrisma<Settings>(json);
  return deserialized;
}

export async function loginWithGitHub() {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    window.location.href = `${window.location.origin}/`;
    return;
  }

  window.location.href = `${window.location.origin}/auth/login/github`;
  // DOes not work because of cors
  // return fetch("/auth/login/github", {
  //   headers: {
  //     "Access-Control-Allow-Origin": "https://github.com/",
  //   },
  // });
  // const githubLoginUrl = new URL(
  //   "/login/oauth/authorize",
  //   "https://github.com"
  // );
  // githubLoginUrl.searchParams.set("scope", "user:email,read:user");
  // githubLoginUrl.searchParams.set(
  //   "client_id",
  //   import.meta.env.VITE_GITHUB_CLIENT_ID
  // );
  // // @ts-expect-error This is recommended by MDN
  // window.location = githubLoginUrl;
}

export async function getAuthCallbackGithub({
  code,
  state,
}: {
  code: string;
  state: string;
}) {
  const url = new URL("/auth/github", window.location.href);
  url.searchParams.set("code", code);
  url.searchParams.set("state", state);
  const res = await authorizedFetch(url);
  return res;
}

export async function logout() {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    window.location.href = `${window.location.origin}/login`;
  }

  return authorizedFetch("/auth/logout", {
    method: "DELETE",
  });
}

export async function getModerations({
  status,
  limit,
  skip,
  sort,
  exam,
}: {
  status?: ExamEnvironmentExamModerationStatus;
  limit?: number;
  skip?: number;
  sort?: number;
  exam?: string;
}): Promise<ExamEnvironmentExamModeration[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const res = await fetch("/mocks/moderations.json");
    if (!res.ok) {
      throw new Error(
        `Failed to load mock moderations: ${res.status} - ${res.statusText}`,
      );
    }
    const moderations =
      deserializeToPrisma<ExamEnvironmentExamModeration[]>(await res.json());

    let filtered = moderations;
    if (status) {
      filtered = filtered.filter((m) => m.status === status);
    }
    if (exam !== undefined) {
      const attempts = await getMockAttempts();
      const attemptIds = attempts
        .filter((a) => a.examId === exam)
        .map((a) => a.id);
      filtered = filtered.filter((m) => attemptIds.includes(m.examAttemptId));
    }
    if (sort !== undefined) {
      filtered = filtered.toSorted(
        (a, b) =>
          sort * (a.submissionDate.getTime() - b.submissionDate.getTime()),
      );
    }
    return filtered.slice(skip ?? 0, (skip ?? 0) + (limit ?? filtered.length));
  }

  const url = new URL("/api/attempts", window.location.href);
  if (status) {
    url.searchParams.set("status", status);
  }
  if (limit !== undefined) {
    url.searchParams.set("limit", limit.toString());
  }
  if (skip !== undefined) {
    url.searchParams.set("skip", skip.toString());
  }
  if (sort !== undefined) {
    url.searchParams.set("sort", sort.toString());
  }
  if (exam !== undefined) {
    url.searchParams.set("exam", exam);
  }
  const res = await authorizedFetch(url);
  const json = await res.json();
  const deserialized =
    deserializeToPrisma<ExamEnvironmentExamModeration[]>(json);
  return deserialized;
}

interface PatchModerationStatus {
  attemptId: string;
  status: ExamEnvironmentExamModerationStatus;
}

export async function patchModerationStatusByAttemptId({
  attemptId,
  status,
}: PatchModerationStatus) {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    return;
  }

  return await authorizedFetch(`/api/attempts/${attemptId}/moderation`, {
    method: "PATCH",
    body: JSON.stringify(serializeFromPrisma({ attemptId, status })),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function putModerationViewStart(attemptId: string) {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    return;
  }

  return await authorizedFetch(`/api/attempts/${attemptId}/moderation/view`, {
    method: "PUT",
  });
}

interface GetModerationsCountResponse {
  staging: {
    pending: number;
    approved: number;
    denied: number;
  };
  production: {
    pending: number;
    approved: number;
    denied: number;
  };
}

export async function getModerationsCount() {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    // Staging counts match `mocks/moderations.json`
    const moderationCounts: GetModerationsCountResponse = {
      staging: {
        pending: 1,
        approved: 1,
        denied: 1,
      },
      production: {
        pending: 4,
        approved: 2000,
        denied: 32,
      },
    };
    return moderationCounts;
  }
  const res = await authorizedFetch(`/api/attempts/moderations/count`);
  const json = await res.json();
  const deserialized = deserializeToPrisma<GetModerationsCountResponse>(json);
  return deserialized;
}

export async function getModerationByAttemptId(attemptId: string) {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const res = await fetch("/mocks/moderations.json");
    if (!res.ok) {
      throw new Error(
        `Failed to load mock moderations: ${res.status} - ${res.statusText}`,
      );
    }
    const moderations = await res.json();

    const deserialized =
      deserializeToPrisma<ExamEnvironmentExamModeration[]>(moderations);
    const mod = deserialized.find((m) => m.examAttemptId === attemptId);
    return mod;
  }
  const res = await authorizedFetch(`/api/attempts/${attemptId}/moderation`);
  const json = await res.json();
  const deserialized = deserializeToPrisma<ExamEnvironmentExamModeration>(json);
  return deserialized;
}

// export async function getAttempts(): Promise<Attempt[]> {
//   if (import.meta.env.VITE_MOCK_DATA === "true") {
//     await delayForTesting(300);
//     const res = await fetch("/mocks/attempts.json");
//     if (!res.ok) {
//       throw new Error(
//         `Failed to load mock attempts: ${res.status} - ${res.statusText}`
//       );
//     }
//     const attempts = await res.json();
//     return deserializeToPrisma(attempts);
//   }

//   const res = await authorizedFetch("/api/attempts");
//   const json = await res.json();
//   const deserialized = deserializeToPrisma<Attempt[]>(json);
//   return deserialized;
// }

export async function getAttemptById(attemptId: string): Promise<Attempt> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const attempts = await getMockAttempts();
    const attempt = attempts.find((a) => a.id === attemptId) ?? attempts[0];

    // Re-base times so the attempt always appears recent
    const originalStart = attempt.startTime.getTime();
    const startTime = new Date();
    attempt.startTime = startTime;
    for (const questionSet of attempt.questionSets) {
      for (const question of questionSet.questions) {
        if (question.submissionTime) {
          question.submissionTime = new Date(
            startTime.getTime() +
              (question.submissionTime.getTime() - originalStart),
          );
        }
      }
    }

    return attempt;
  }

  const res = await authorizedFetch(`/api/attempts/${attemptId}`);
  const json = await res.json();
  const deserialized = deserializeToPrisma<Attempt>(json);
  return deserialized;
}

/// Schedule server-side deletion of an attempt (and its moderation) after a grace
/// period. The server owns the timer, so it runs even if the client navigates away.
export async function scheduleAttemptDeletion(
  attemptId: string,
): Promise<Response> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    return new Response();
  }

  return await authorizedFetch(`/api/attempts/${attemptId}/pending-deletion`, {
    method: "PUT",
  });
}

/// Cancel a pending server-side attempt deletion (undo).
export async function cancelAttemptDeletion(
  attemptId: string,
): Promise<Response> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    return new Response();
  }

  return await authorizedFetch(`/api/attempts/${attemptId}/pending-deletion`, {
    method: "DELETE",
  });
}

export async function getAttemptsByUserId(userId: string): Promise<Attempt[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const attempts = await getMockAttempts();

    return attempts.filter((a) => a.userId === userId);
  }

  const res = await authorizedFetch(`/api/attempts/user/${userId}`);
  const json = await res.json();
  const deserialized = deserializeToPrisma<Attempt[]>(json);
  return deserialized;
}

export type UserSearchBy =
  | { user_id: string }
  | { attempt_id: string }
  | { moderation_id: string }
  | { username: string }
  | { email: string };

export interface UserSearchResult {
  user: {
    id: string;
    username?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  attempts: Attempt[];
  moderations: ExamEnvironmentExamModeration[];
}

export async function getUserSearch(
  params: UserSearchBy,
): Promise<UserSearchResult> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const attempts = await getMockAttempts();
    const moderationsRes = await fetch("/mocks/moderations.json");
    const moderations: ExamEnvironmentExamModeration[] = deserializeToPrisma(
      await moderationsRes.json(),
    );

    return {
      user: {
        id: attempts[0]?.userId ?? "5f9f1b9b9c9d440000a1b0f1",
        username: "camperbot",
        email: "camperbot@freecodecamp.org",
        name: "Camper Bot",
        picture: "https://avatars.githubusercontent.com/u/13561988?v=4",
      },
      attempts,
      moderations,
    };
  }

  const url = new URL("/api/users/search", window.location.href);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await authorizedFetch(url);
  const json = await res.json();
  const deserialized = deserializeToPrisma<UserSearchResult>(json);
  return deserialized;
}

export async function getNumberOfAttemptsByUserId(
  userId: string,
): Promise<number> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const attempts = await getMockAttempts();

    return attempts.filter((a) => a.userId === userId).length;
  }

  const res = await authorizedFetch(`/api/attempts/user/${userId}/count`);
  const json = await res.json();
  const deserialized = deserializeToPrisma<number>(json);
  return deserialized;
}

export async function getExamChallengeByExamId(
  examId: ExamCreatorExam["id"],
): Promise<ExamEnvironmentChallenge[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const exams = await fetch("/mocks/exams.json");

    if (!exams.ok) {
      throw new Error(
        `Failed to load mock exam: ${exams.status} - ${exams.statusText}`,
      );
    }

    const examData: GetExam[] = deserializeToPrisma(await exams.json());
    const exam = examData.find((e) => e.exam.id === examId)?.exam;

    if (!exam) {
      return [];
    }

    return [
      {
        id: exam.id,
        examId: exam.id,
        challengeId: exam.id,
        version: 1,
      },
    ];
  }

  const res = await authorizedFetch(`/api/exam-challenges/${examId}`, {
    method: "GET",
  });
  const json = await res.json();
  const deserialized = deserializeToPrisma<ExamEnvironmentChallenge[]>(json);
  return deserialized.filter((challenge) => challenge.examId === examId);
}

export async function putExamEnvironmentChallenges(
  examId: string,
  examEnvironmentChallenges: Omit<ExamEnvironmentChallenge, "id">[],
): Promise<ExamEnvironmentChallenge[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    return examEnvironmentChallenges.map((challenge, index) => ({
      ...challenge,
      id: `mock-id-${index}`,
    }));
  }

  const res = await authorizedFetch(`/api/exam-challenges/${examId}`, {
    method: "PUT",
    body: JSON.stringify(serializeFromPrisma(examEnvironmentChallenges)),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  const deserialized = deserializeToPrisma<ExamEnvironmentChallenge[]>(json);
  return deserialized;
}

// export async function deleteExamEnvironmentChallengeById({
//   challengeId,
// }: {
//   challengeId: ExamEnvironmentChallenge["challengeId"];
// }): Promise<ExamEnvironmentChallenge[]> {
//   if (import.meta.env.VITE_MOCK_DATA === "true") {
//     await delayForTesting(300);

//     return [];
//   }

//   const res = await authorizedFetch(
//     `/api/exam-challenge?challengeId=${challengeId}`,
//     {
//       method: "DELETE",
//     }
//   );

//   const json = await res.json();
//   const deserialized = deserializeToPrisma<ExamEnvironmentChallenge[]>(json);
//   return deserialized;
// }

export async function putExamByIdToStaging(examId: string) {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    return new Response();
  }

  return await authorizedFetch(`/api/exams/${examId}/seed/staging`, {
    method: "PUT",
  });
}

export async function putExamByIdToProduction(
  examId: string,
): Promise<Response> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    return new Response();
  }

  return await authorizedFetch(`/api/exams/${examId}/seed/production`, {
    method: "PUT",
  });
}

// How many attempts each attempt in `mocks/attempts.json` is expanded into for
// the metrics endpoints, to make distributions/histograms worth looking at.
const MOCK_ATTEMPT_MULTIPLIER = 12;

async function getMockAttempts(): Promise<Attempt[]> {
  const res = await fetch(`/mocks/attempts.json`);
  if (!res.ok) {
    throw new Error(
      `Failed to load mock attempts: ${res.status} - ${res.statusText}`,
    );
  }
  return deserializeToPrisma<Attempt[]>(await res.json());
}

export async function getExamsMetrics() {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const [exams, attempts] = await Promise.all([
      getExams(),
      getMockAttempts(),
    ]);
    return exams.map(({ exam }) => ({
      exam: exam as ExamCreatorExam,
      numberOfAttempts:
        attempts.filter((a) => a.examId === exam.id).length *
        MOCK_ATTEMPT_MULTIPLIER,
    }));
  }

  const res = await authorizedFetch(`/api/metrics/exams`, {
    method: "GET",
  });

  const json = await res.json();
  const deserialized = deserializeToPrisma<
    {
      exam: ExamCreatorExam;
      numberOfAttempts: number;
    }[]
  >(json);
  return deserialized;
}

interface GetExamMetricsById {
  exam: ExamCreatorExam;
  attempts: ExamEnvironmentExamAttempt[];
  generations: ExamEnvironmentGeneratedExam[];
}

export async function getExamMetricsById(examId: string) {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const [exam, generations, mockAttempts] = await Promise.all([
      getExamById(examId),
      getGenerations({ examId, databaseEnvironment: "Staging" }),
      getMockAttempts(),
    ]);

    // Expand each base attempt into several attempts with varied start times
    // and pacing so the histogram/distribution views have data.
    const attempts: ExamEnvironmentExamAttempt[] = mockAttempts
      .filter((a) => a.examId === examId)
      .flatMap((attempt, attemptIndex) =>
        Array.from({ length: MOCK_ATTEMPT_MULTIPLIER }, (_, i) => {
          const idx = attemptIndex * MOCK_ATTEMPT_MULTIPLIER + i;
          const startTime = new Date(
            Date.now() - (idx + 1) * 12 * 60 * 60 * 1000,
          );
          const pacing = 0.5 + (idx % 7) * 0.35;
          return {
            id: attempt.id.slice(0, 20) + idx.toString(16).padStart(4, "0"),
            userId: attempt.userId,
            examId: attempt.examId,
            generatedExamId: attempt.generatedExamId,
            startTime,
            version: 3,
            questionSets: attempt.questionSets.map((qs) => ({
              id: qs.id,
              questions: qs.questions
                .filter((q) => q.submissionTime)
                .map((q) => ({
                  id: q.id,
                  answers: q.selected,
                  submissionTime: new Date(
                    startTime.getTime() +
                      (q.submissionTime!.getTime() -
                        attempt.startTime.getTime()) *
                        pacing,
                  ),
                })),
            })),
          };
        }),
      );

    const examMetrics: GetExamMetricsById = { exam, attempts, generations };
    return examMetrics;
  }

  const res = await authorizedFetch(`/api/metrics/exams/${examId}`, {
    method: "GET",
  });

  const json = await res.json();
  const deserialized = deserializeToPrisma<GetExamMetricsById>(json);
  return deserialized;
}

export async function getExamAttemptStats() {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const attempts = await getMockAttempts();
    const now = Date.now();
    return attempts.flatMap((attempt, attemptIndex) =>
      Array.from({ length: MOCK_ATTEMPT_MULTIPLIER }, (_, i) => ({
        examId: attempt.examId,
        startTime: new Date(
          now -
            (attemptIndex * MOCK_ATTEMPT_MULTIPLIER + i + 1) *
              12 *
              60 *
              60 *
              1000,
        ),
      })),
    );
  }

  const res = await authorizedFetch(`/api/metrics/attempts`, {
    method: "GET",
  });

  const json = await res.json();
  const deserialized = deserializeToPrisma<
    {
      examId: string;
      startTime: Date;
    }[]
  >(json);
  return deserialized;
}

export async function getEventsByAttemptId(
  attemptId: string,
): Promise<Event[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const attempt = await getAttemptById(attemptId);
    const res = await fetch(`/mocks/api/events/attempts/${attempt.id}.json`);

    if (!res.ok) {
      throw new Error(
        `Failed to load mock events: ${res.status} - ${res.statusText}`,
      );
    }

    const json = await res.json();
    const events = deserializeToPrisma<Event[]>(json);

    // Mock event timestamps are relative to the attempt's original start time,
    // but `getAttemptById` re-bases the attempt to now. Shift events to match.
    const firstEventTime = Math.min(
      ...events.map((e) => e.timestamp.getTime()),
    );
    const startTime = attempt.startTime.getTime();
    return events.map((e) => ({
      ...e,
      timestamp: new Date(startTime + (e.timestamp.getTime() - firstEventTime)),
    }));
  }

  const res = await authorizedFetch(`/api/events/attempts/${attemptId}`);
  const json = await res.json();
  console.debug(json);
  const deserialized = deserializeToPrisma<Event[]>(json);
  return deserialized;
}

export async function getStatusPing() {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const res = new Response("pong");
    return res.text();
  }

  const res = await fetch("/status/ping", {
    method: "GET",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  return res.text();
}

export async function delayForTesting(t: number) {
  await new Promise((res, _) => setTimeout(res, t));
}
