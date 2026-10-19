// Loads every Pinebrook doc in content/pinebrook as a sample doc. Safe to rerun. Usage: npm run ingest
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { passageRepository } from "../src/server/repositories/passage-repository";
import { documentService } from "../src/server/services/document-service";

const contentDir = path.join(process.cwd(), "content", "pinebrook");

async function main() {
  // README.md describes the folder; it isn't a help doc.
  const files = (await readdir(contentDir)).filter((file) => file.endsWith(".md") && file !== "README.md").sort();

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const document = await documentService.upsertSample(slug, await readFile(path.join(contentDir, file), "utf8"));
    console.log(`${document.title}: ${document.passage_count} passages`);
  }

  console.log(`total passages in database: ${await passageRepository.count()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
