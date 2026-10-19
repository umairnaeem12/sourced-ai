import { randomUUID } from "node:crypto";
import type { StoredCitation } from "../repositories/question-repository";
import {
  answeredTopics,
  gapTopics,
  resolvedGaps,
  sampleCustomers,
  sampleNotes,
  type AnsweredTopic,
  type CitedSection,
  type GapTopic,
} from "./pinebrook-activity";

export interface SampleQuestion {
  id: string;
  conversation_id: string;
  question: string;
  is_answered: boolean;
  answer_text: string;
  top_similarity: number;
  provider: string | null;
  citations: StoredCitation[];
  question_embedding: number[] | null;
  gap_id: string | null;
  created_at: Date;
  // Not stored: which gap topic produced it, for picking resolved gaps.
  gap_key: string | null;
}

export interface SampleHandoff {
  id: string;
  conversation_id: string;
  email: string | null;
  created_at: Date;
  handled_at: Date | null;
}

export interface SampleNote {
  handoff_id: string;
  body: string;
  created_at: Date;
}

export interface SampleActivity {
  questions: SampleQuestion[];
  handoffs: SampleHandoff[];
  notes: SampleNote[];
  resolutions: { gap_id: string; resolved_at: Date }[];
}

export interface BuildOptions {
  now: Date;
  days: number;
  storeName: string;
  timeZone: string;
  gapThreshold: number;
  // Live passage text for a cited section; the seed fails if a doc is missing.
  passageOf: (section: CitedSection) => Omit<StoredCitation, "number">;
  embeddingOf: (text: string) => number[];
  random?: () => number;
}

const MINUTE = 60_000;
const CONVERSATIONS_PER_DAY = 6.2;
const GAP_SHARE = 0.13;
const HANDOFFS = 12;
// ISO weekday 1 (Mon) to 7 (Sun).
const WEEKDAY_FACTOR = [0, 1.1, 1.05, 1, 1, 0.9, 0.7, 0.65];
const HOUR_WEIGHTS = [0.2, 0.1, 0.05, 0.05, 0.05, 0.1, 0.3, 0.6, 1, 1.4, 1.6, 1.6, 1.5, 1.5, 1.4, 1.3, 1.2, 1.1, 1.2, 1.4, 1.5, 1.2, 0.7, 0.4];
const QUESTIONS_PER_CHAT = [
  { value: 1, weight: 30 },
  { value: 2, weight: 33 },
  { value: 3, weight: 22 },
  { value: 4, weight: 15 },
];
const HANDLE_MINUTES = [12, 25, 40, 70, 95, 140, 200, 320, 600, 1100];

// Small seeded generator so a run is reproducible for a given start.
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(items: T[], weightOf: (item: T) => number, random: () => number): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function between(min: number, max: number, random: () => number): number {
  return min + (max - min) * random();
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Minutes the zone is ahead of UTC at this instant (negative west of Greenwich).
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - instant.getTime()) / MINUTE);
}

// A wall-clock time in the store's zone as a real instant.
export function zonedInstant(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - zoneOffsetMinutes(new Date(guess), timeZone) * MINUTE;
  return new Date(guess - zoneOffsetMinutes(new Date(first), timeZone) * MINUTE);
}

function localDate(instant: Date, timeZone: string): { year: number; month: number; day: number; weekday: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric", weekday: "short" })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  const weekday = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday);
  return { year: +parts.year, month: +parts.month, day: +parts.day, weekday };
}

function citationsFor(topic: AnsweredTopic, passageOf: BuildOptions["passageOf"]): StoredCitation[] {
  return topic.cites.map((section, i) => ({ number: i + 1, ...passageOf(section) }));
}

// Spec 005 B29: 30 days of believable activity ending at `now`, in the store's time zone.
export function buildSampleActivity(options: BuildOptions): SampleActivity {
  const random = options.random ?? mulberry32(20261019);
  const { now, timeZone } = options;
  const notAnswered = `I couldn't find that in ${options.storeName}'s help docs, so I won't guess.`;
  const questions: SampleQuestion[] = [];

  for (let daysAgo = options.days - 1; daysAgo >= 0; daysAgo--) {
    const date = localDate(new Date(now.getTime() - daysAgo * 24 * 60 * MINUTE), timeZone);
    // Gentle growth over the month, like a store that just turned the assistant on.
    const growth = 0.75 + 0.5 * ((options.days - 1 - daysAgo) / Math.max(1, options.days - 1));
    const chats = Math.max(1, Math.round(CONVERSATIONS_PER_DAY * WEEKDAY_FACTOR[date.weekday] * growth + between(-1.2, 1.2, random)));

    for (let c = 0; c < chats; c++) {
      const hour = pickWeighted(HOUR_WEIGHTS.map((weight, h) => ({ h, weight })), (item) => item.weight, random).h;
      let at = zonedInstant(date.year, date.month, date.day, hour, Math.floor(random() * 60), timeZone);
      if (at > now) continue;

      const conversationId = randomUUID();
      const count = pickWeighted(QUESTIONS_PER_CHAT, (item) => item.weight, random).value;
      const used = new Set<AnsweredTopic | GapTopic>();
      for (let q = 0; q < count && at <= now; q++) {
        const isGap = random() < GAP_SHARE;
        if (isGap) {
          const topic = pickWeighted(gapTopics.filter((t) => !used.has(t)), (t) => t.weight, random);
          used.add(topic);
          const declinedByModel = random() < 0.2;
          questions.push({
            id: randomUUID(),
            conversation_id: conversationId,
            question: topic.wordings[Math.floor(random() * topic.wordings.length)],
            is_answered: false,
            answer_text: notAnswered,
            top_similarity: declinedByModel ? between(0.55, 0.6, random) : between(0.32, 0.54, random),
            provider: declinedByModel ? "gemini" : null,
            citations: [],
            question_embedding: null,
            gap_id: null,
            created_at: at,
            gap_key: topic.key,
          });
        } else {
          const topic = pickWeighted(answeredTopics.filter((t) => !used.has(t)), (t) => t.weight, random);
          used.add(topic);
          questions.push({
            id: randomUUID(),
            conversation_id: conversationId,
            question: topic.wordings[Math.floor(random() * topic.wordings.length)],
            is_answered: true,
            answer_text: topic.answer,
            top_similarity: between(0.62, 0.86, random),
            provider: random() < 0.97 ? "gemini" : "groq",
            citations: citationsFor(topic, options.passageOf),
            question_embedding: null,
            gap_id: null,
            created_at: at,
            gap_key: null,
          });
        }
        at = new Date(at.getTime() + between(25, 110, random) * 1000);
      }
    }
  }
  questions.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

  assignGaps(questions, options);
  const resolutions = resolveGaps(questions, now);
  const { handoffs, notes } = buildHandoffs(questions, now, random);
  return { questions, handoffs, notes, resolutions };
}

// The live rule (spec 005 T4): join the closest earlier unanswered question at or above the threshold.
function assignGaps(questions: SampleQuestion[], options: BuildOptions): void {
  const earlier: SampleQuestion[] = [];
  for (const question of questions) {
    if (question.is_answered) continue;
    question.question_embedding = options.embeddingOf(question.question);
    let best: SampleQuestion | null = null;
    let bestScore = options.gapThreshold;
    for (const candidate of earlier) {
      const score = cosine(question.question_embedding, candidate.question_embedding!);
      if (score >= bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    question.gap_id = best?.gap_id ?? randomUUID();
    earlier.push(question);
  }
}

function resolveGaps(questions: SampleQuestion[], now: Date): { gap_id: string; resolved_at: Date }[] {
  const resolutions: { gap_id: string; resolved_at: Date }[] = [];
  for (const { key, askedAgain } of resolvedGaps) {
    const asked = questions.filter((question) => question.gap_key === key);
    if (asked.length === 0) continue;
    const last = asked[asked.length - 1].created_at.getTime();
    const beforeLast = asked.length > 1 ? asked[asked.length - 2].created_at.getTime() : null;
    const resolvedAt =
      askedAgain && beforeLast !== null
        ? new Date((beforeLast + last) / 2)
        : new Date(Math.min(last + 24 * 60 * MINUTE, now.getTime() - 60 * MINUTE));
    for (const gapId of new Set(asked.map((question) => question.gap_id!))) {
      resolutions.push({ gap_id: gapId, resolved_at: resolvedAt });
    }
  }
  return resolutions;
}

function buildHandoffs(questions: SampleQuestion[], now: Date, random: () => number): { handoffs: SampleHandoff[]; notes: SampleNote[] } {
  const byConversation = new Map<string, SampleQuestion[]>();
  for (const question of questions) {
    byConversation.set(question.conversation_id, [...(byConversation.get(question.conversation_id) ?? []), question]);
  }
  const chats = [...byConversation.values()];
  const withGap = chats.filter((chat) => chat.some((question) => !question.is_answered));
  const allAnswered = chats.filter((chat) => chat.every((question) => question.is_answered));
  const chosen = [
    ...shuffle(withGap, random).slice(0, HANDOFFS - 3),
    ...shuffle(allAnswered, random).slice(0, 3),
  ];

  const handoffs: SampleHandoff[] = [];
  const notes: SampleNote[] = [];
  let noteIndex = 0;
  for (const chat of chosen) {
    const lastAt = chat[chat.length - 1].created_at.getTime();
    const createdAt = new Date(Math.min(lastAt + between(40, 180, random) * 1000, now.getTime()));
    const handled =
      now.getTime() - createdAt.getTime() > 6 * 60 * MINUTE && random() < 0.85
        ? new Date(Math.min(createdAt.getTime() + HANDLE_MINUTES[Math.floor(random() * HANDLE_MINUTES.length)] * MINUTE, now.getTime()))
        : null;
    const handoff: SampleHandoff = {
      id: randomUUID(),
      conversation_id: chat[0].conversation_id,
      email: random() < 0.75 ? sampleCustomers[handoffs.length % sampleCustomers.length] : null,
      created_at: createdAt,
      handled_at: handled,
    };
    handoffs.push(handoff);
    if (noteIndex < sampleNotes.length && (handled || random() < 0.3)) {
      const end = handled?.getTime() ?? now.getTime();
      notes.push({
        handoff_id: handoff.id,
        body: sampleNotes[noteIndex++],
        created_at: new Date(createdAt.getTime() + (end - createdAt.getTime()) * between(0.3, 0.9, random)),
      });
    }
  }
  return { handoffs, notes };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
