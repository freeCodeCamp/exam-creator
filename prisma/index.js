/**
 * This script gets the latest `schema.prisma`
 */
import { writeFile } from "fs/promises";

const GITHUB_PRISMA_URLS = [
  "https://raw.githubusercontent.com/ShaunSHamilton/freeCodeCamp/breaking_prisma-dates/api/prisma/schema.prisma",
  "https://raw.githubusercontent.com/ShaunSHamilton/freeCodeCamp/breaking_prisma-dates/api/prisma/exam-environment.prisma",
  "https://raw.githubusercontent.com/ShaunSHamilton/freeCodeCamp/breaking_prisma-dates/api/prisma/exam-creator.prisma",
];

async function main() {
  try {
    for (const url of GITHUB_PRISMA_URLS) {
      const data = await fetch(url);
      const file = await data.text();
      const fileName = url.split("/").pop();
      await writeFile("./prisma/" + fileName, file);
    }
  } catch (e) {
    console.error(e);
    return e;
  }
}

await main();
