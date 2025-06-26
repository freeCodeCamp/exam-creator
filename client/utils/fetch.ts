import type { EnvExam } from "@prisma/client";
import type { ClientSync, SessionUser, User } from "../types";
import { deserializeToPrisma, serializeFromPrisma } from "./serde";

async function authorizedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const headers = {
    ...options?.headers,
  };

  const res = await fetch(url, {
    ...{ ...options, credentials: "include" },
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(
      `API Error: ${res.status} - ${errorData.message || res.statusText}`
    );
  }

  const json = await res.json();
  return deserializeToPrisma(json);
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

  return authorizedFetch<EnvExam>(`/state/exams/${examId}`, {
    method: "PUT",
  });
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
            exam: null,
            lastActive: Date.now(),
          },
        },
      ],
      exams: [],
    };

    return clientSync;
  }

  return authorizedFetch<ClientSync>("/state");
}

// Update the state on the server
export async function putState(state: ClientSync): Promise<ClientSync> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    return state;
  }

  return authorizedFetch<ClientSync>("/state", {
    method: "PUT",
    body: JSON.stringify(serializeFromPrisma(state)),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function getExams(): Promise<EnvExam[]> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);
    const res = await fetch("/mocks/exams.json");
    if (!res.ok) {
      throw new Error(
        `Failed to load mock exams: ${res.status} - ${res.statusText}`
      );
    }
    const exams: EnvExam[] = await res.json();
    return exams.map((e) => deserializeToPrisma(e));
  }

  return authorizedFetch<EnvExam[]>("/exams");
}

export async function getExamById(examId: string): Promise<EnvExam> {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    const res = await fetch(`/mocks/exams.json`);
    const exams: EnvExam[] = deserializeToPrisma(await res.json());
    const exam = exams.find((exam) => exam.id === examId)!;
    return exam;
  }

  return authorizedFetch<EnvExam>(`/exams/${examId}`);
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

  return authorizedFetch<EnvExam>(`/exams/${exam.id}`, {
    method: "PUT",
    body: JSON.stringify(serializeFromPrisma(exam)),
    headers: {
      "Content-Type": "application/json",
    },
  });
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

  return authorizedFetch<EnvExam>("/exams", {
    method: "POST",
  });
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

  return authorizedFetch<User[]>("/users");
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

  return authorizedFetch<SessionUser>("/users/session");
}

export async function loginWithGitHub() {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    window.location.href = `${window.location.origin}/`;
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

export async function logout() {
  if (import.meta.env.VITE_MOCK_DATA === "true") {
    await delayForTesting(300);

    window.location.href = `${window.location.origin}/login`;
  }

  return authorizedFetch("/auth/logout", {
    method: "DELETE",
  });
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
