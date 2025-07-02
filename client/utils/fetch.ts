import type { EnvExam } from "@prisma/client";
import type { ClientSync, SessionUser, User } from "../types";
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
            exam: null,
            lastActive: Date.now(),
          },
        },
      ],
      exams: [],
    };

    return clientSync;
  }

  const res = await authorizedFetch("/state");
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

  const res = await authorizedFetch("/state", {
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

  const res = await authorizedFetch("/exams");
  const json = await res.json();
  const deserialized = deserializeToPrisma<EnvExam[]>(json);
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

  const res = await authorizedFetch(`/exams/${examId}`);
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

  const res = await authorizedFetch(`/exams/${exam.id}`, {
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

  const res = await authorizedFetch("/exams", {
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

  const res = await authorizedFetch("/users");
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

  const res = await authorizedFetch("/users/session");
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
