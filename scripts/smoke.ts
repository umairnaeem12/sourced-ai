// Asks real questions against the real stack and prints scores, for tuning MIN_SIMILARITY.
// Usage: npm run smoke [-- "your own question"]
import { GeminiEmbedding } from "../src/server/ai/gemini-embedding";
import { loadConfig } from "../src/server/config";
import { passageRepository } from "../src/server/repositories/passage-repository";
import { questionService } from "../src/server/services/question-service";

const defaultQuestions = [
  "Can I return a kettle I've already used?",
  "How long does shipping to Canada take?",
  "Do you price match?",
];

async function main() {
  const config = loadConfig();
  const embedding = new GeminiEmbedding(config.GEMINI_API_KEY, config.GEMINI_EMBEDDING_MODEL);
  const questions = process.argv.slice(2).length ? process.argv.slice(2) : defaultQuestions;

  console.log(`provider ${config.AI_PROVIDER}, min similarity ${config.MIN_SIMILARITY}\n`);
  for (const question of questions) {
    const closest = await passageRepository.findClosest(await embedding.embedQuery(question), 4);
    const answer = await questionService.answer(question);
    console.log(`Q: ${question}`);
    for (const passage of closest) {
      console.log(`   ${passage.similarity.toFixed(3)}  ${passage.document_title} > ${passage.heading}`);
    }
    console.log(`A: [${answer.is_answered ? "answered" : "not answered"}] ${answer.text}`);
    for (const citation of answer.citations) {
      console.log(`   [${citation.number}] ${citation.document_title} > ${citation.heading}`);
    }
    console.log();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
