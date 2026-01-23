import { deserializeToPrisma } from "./serde";

const data = {
  id: "6c74bd90-d55a-4851-928f-36431b80ccda",
  timestamp: "2026-01-22T08:46:29.009643+00:00",
  kind: "QUESTION_VISIT",
  meta: {
    question: "66e9a8fecac3bbedc76f6bca",
  },
  attempt_id: {
    $oid: "6971e3e16707f4795610dd52",
  },
};

const de = deserializeToPrisma(data);

console.log(de);
