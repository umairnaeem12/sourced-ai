// Loads 30 days of sample Pinebrook activity into the admin (spec 005).
// Usage: npm run seed:demo            replace the sample set, ending now
//        npm run seed:demo -- --clear  remove the sample set only
//        npm run seed:demo -- --reset  delete ALL questions and handoffs first, then seed
import { GeminiEmbedding } from "../src/server/ai/gemini-embedding";
import { loadConfig } from "../src/server/config";
import { GAP_MATCH_SIMILARITY } from "../src/server/repositories/question-repository";
import { sampleActivityRepository } from "../src/server/repositories/sample-activity-repository";
import { gapTopics } from "../src/server/sample/pinebrook-activity";
import { buildSampleActivity } from "../src/server/sample/sample-activity-builder";

const DAYS = 30;

async function main() {
  const args = new Set(process.argv.slice(2));
  const config = loadConfig();

  if (args.has("--clear")) {
    const removed = await sampleActivityRepository.clearSample();
    console.log(`removed the sample set: ${removed.questions} questions, ${removed.handoffs} handoffs`);
    return;
  }
  if (args.has("--reset")) {
    const removed = await sampleActivityRepository.resetAll();
    console.log(`reset: deleted ${removed.questions} questions and ${removed.handoffs} handoffs (documents untouched)`);
  }

  const passages = await sampleActivityRepository.sectionPassages();
  const embedding = new GeminiEmbedding(config.GEMINI_API_KEY, config.GEMINI_EMBEDDING_MODEL);
  const vectors = new Map<string, number[]>();
  // Same query embedding the live chat uses, so sample gaps group exactly as real ones would.
  for (const wording of new Set(gapTopics.flatMap((topic) => topic.wordings))) {
    vectors.set(wording, await embedding.embedQuery(wording));
  }

  const activity = buildSampleActivity({
    now: new Date(),
    days: DAYS,
    storeName: config.STORE_NAME,
    timeZone: config.STORE_TIMEZONE,
    gapThreshold: GAP_MATCH_SIMILARITY,
    embeddingOf: (text) => vectors.get(text)!,
    passageOf: ({ slug, heading }) => {
      const passage = passages.get(`${slug}|${heading}`);
      if (!passage) throw new Error(`No passage "${heading}" in ${slug}. Run npm run ingest first.`);
      return passage;
    },
  });
  await sampleActivityRepository.replaceSample(activity);

  const answered = activity.questions.filter((question) => question.is_answered).length;
  const conversations = new Set(activity.questions.map((question) => question.conversation_id)).size;
  const gaps = new Set(activity.questions.map((question) => question.gap_id).filter(Boolean)).size;
  console.log(
    [
      `sample set loaded for the last ${DAYS} days (${config.STORE_TIMEZONE}):`,
      `  ${conversations} conversations, ${activity.questions.length} questions`,
      `  ${Math.round((answered / activity.questions.length) * 100)}% answered from the docs, ${gaps} gap groups`,
      `  ${activity.handoffs.length} handoffs, ${activity.notes.length} notes`,
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
