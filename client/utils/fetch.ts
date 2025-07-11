import type { EnvExam, ExamEnvironmentExamModeration } from "@prisma/client";
import type { Attempt, ClientSync, SessionUser, User } from "../types";
import { deserializeToPrisma, serializeFromPrisma } from "./serde";

async function authorizedFetch(
  url: string | URL,
  options?: RequestInit
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
  examId: EnvExam["id"]
): Promise<EnvExam> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const res = await fetch("/mocks/exams.json");
    if (!res.ok) {
      throw new Error(
        `Failed to load mock exams: ${res.status} - ${res.statusText}`
      );
    }
    const exams: EnvExam[] = await res.json();

    return exams[0];
  }

  const res = await authorizedFetch(`/state/exams/${examId}`, {
    method: "PUT",
  });
  const json = await res.json();
  const deserialized = deserializeToPrisma<EnvExam>(json);
  return deserialized;
}

export async function getState(): Promise<ClientSync> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const clientSync: ClientSync = {
      users: [
        {
          name: "Camper Bot",
          email: "camperbot@freecodecamp.org",
          picture: "https://avatars.githubusercontent.com/u/13561988?v=4",
          activity: {
            page: new URL(window.location.href),
            lastActive: Date.now(),
          },
        },
      ],
      exams: [],
    };

    return clientSync;
  }

  const res = await authorizedFetch("/api/state");
  const json = await res.json();
  const deserialized = deserializeToPrisma<ClientSync>(json);
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

export async function getExams(): Promise<Omit<EnvExam, "questionSets">[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const res = await fetch("/mocks/exams.json");
    if (!res.ok) {
      throw new Error(
        `Failed to load mock exams: ${res.status} - ${res.statusText}`
      );
    }
    const exams: EnvExam[] = await res.json();
    return exams.map(({ questionSets, ...rest }) => deserializeToPrisma(rest));
  }

  const res = await authorizedFetch("/api/exams");
  const json = await res.json();
  const deserialized =
    deserializeToPrisma<Omit<EnvExam, "questionSets">[]>(json);
  return deserialized;
}

export async function getExamById(examId: string): Promise<EnvExam> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const res = await fetch(`/mocks/exams.json`);
    const exams: EnvExam[] = deserializeToPrisma(await res.json());
    const exam = exams.find((exam) => exam.id === examId)!;
    return exam;
  }

  const res = await authorizedFetch(`/api/exams/${examId}`);
  const json = await res.json();
  const deserialized = deserializeToPrisma<EnvExam>(json);
  return deserialized;
}

/**
 * Updates an existing exam by its ID
 * @param exam The full exam to overwrite the existing one.
 * @returns
 */
export async function putExamById(exam: EnvExam): Promise<EnvExam> {
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
  const deserialized = deserializeToPrisma<EnvExam>(json);
  return deserialized;
}

/**
 * Server creates a new exam
 */
export async function postExam(): Promise<EnvExam> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const exam = await fetch("/mocks/exam.json");

    if (!exam.ok) {
      throw new Error(
        `Failed to load mock exam: ${exam.status} - ${exam.statusText}`
      );
    }

    const examData = await exam.json();

    return deserializeToPrisma(examData);
  }

  const res = await authorizedFetch("/api/exams", {
    method: "POST",
  });
  const json = await res.json();
  const deserialized = deserializeToPrisma<EnvExam>(json);
  return deserialized;
}

export async function getUsers(): Promise<User[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const users = [
      {
        name: "Camper Bot",
        picture: "https://avatars.githubusercontent.com/u/13561988?v=4",
        activity: null,
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

    const user = {
      name: "Camper Bot",
      picture: "https://avatars.githubusercontent.com/u/13561988?v=4",
      activity: null,
      webSocketToken: "",
    };
    const res = new Response(JSON.stringify(user));
    return res.json();
  }

  const res = await authorizedFetch("/api/users/session");
  const json = await res.json();
  const deserialized = deserializeToPrisma<SessionUser>(json);
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

export async function getModerations(): Promise<
  ExamEnvironmentExamModeration[]
> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const res = await fetch("/mocks/moderations.json");
    if (!res.ok) {
      throw new Error(
        `Failed to load mock moderations: ${res.status} - ${res.statusText}`
      );
    }
    const moderations = await res.json();
    return deserializeToPrisma(moderations);
  }

  const res = await authorizedFetch("/api/moderations");
  const json = await res.json();
  const deserialized =
    deserializeToPrisma<ExamEnvironmentExamModeration[]>(json);
  return deserialized;
}

export async function getModerationById(
  moderationId: string
): Promise<ExamEnvironmentExamModeration> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const res = await fetch("/mocks/moderations.json");
    if (!res.ok) {
      throw new Error(
        `Failed to load mock moderations: ${res.status} - ${res.statusText}`
      );
    }
    const moderations = await res.json();
    const moderation = moderations[0];
    // NOTE: This is an RFC 3339 date string
    moderation.submissionDate = new Date(
      Date.now() - 10 * 60 * 60 * 1000
    ).toISOString();
    return deserializeToPrisma(moderation);
  }

  const res = await authorizedFetch(`/api/moderations/${moderationId}`);
  const json = await res.json();
  const deserialized = deserializeToPrisma<ExamEnvironmentExamModeration>(json);
  return deserialized;
}

export async function getAttempts(): Promise<Attempt[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const res = await fetch("/mocks/attempts.json");
    if (!res.ok) {
      throw new Error(
        `Failed to load mock attempts: ${res.status} - ${res.statusText}`
      );
    }
    const attempts = await res.json();
    return deserializeToPrisma(attempts);
  }

  const res = await authorizedFetch("/api/attempts");
  const json = await res.json();
  const deserialized = deserializeToPrisma<Attempt[]>(json);
  return deserialized;
}

export async function getAttemptById(attemptId: string): Promise<Attempt> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const res = await fetch(`/mocks/attempts.json`);
    const attempts: Attempt[] = deserializeToPrisma(await res.json());
    const attempt = attempts[0];

    const startTimeInMS = Date.now() - 10 * 60 * 60 * 1000;
    attempt.startTimeInMS = startTimeInMS;

    attempt.questionSets[0].questions[0].submissionTimeInMS =
      startTimeInMS + 25_000;
    attempt.questionSets[1].questions[0].submissionTimeInMS =
      startTimeInMS + 25_000 * 2;
    attempt.questionSets[2].questions[0].submissionTimeInMS =
      startTimeInMS + 25_000 * 4;
    attempt.questionSets[2].questions[1].submissionTimeInMS =
      startTimeInMS + 25_000 * 4.5;
    attempt.questionSets[2].questions[2].submissionTimeInMS =
      startTimeInMS + 25_000 * 7;

    return attempt;
  }

  const res = await authorizedFetch(`/api/attempts/${attemptId}`);
  const json = await res.json();
  const deserialized = deserializeToPrisma<Attempt>(json);
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
