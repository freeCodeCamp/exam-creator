/**
 * This script gets the latest `schema.prisma`, then adds modifier doc comments to fields named `type`
 */
import { writeFile } from "fs/promises";

const GITHUB_PRISMA_URL =
  "https://raw.githubusercontent.com/ShaunSHamilton/freeCodeCamp/refs/heads/chore_rename-temp-collection/api/prisma/schema.prisma";

async function get_prisma_schema() {
  try {
    const data = await fetch(GITHUB_PRISMA_URL);
    const schema = await data.text();
    return schema;
  } catch (e) {
    return e;
  }
}

async function main() {
  let schema = await get_prisma_schema();

  if (schema instanceof Error) {
    console.error(schema);
    return;
  }

  await writeFile("./prisma/schema.prisma", schema);
}

await main();
