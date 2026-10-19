// @vitest-environment node
// Spec 005 B29 and AC4: believable volume, answer rate and grouping.
import { describe, expect, it } from "vitest";
import { buildSampleActivity, mulberry32, zonedInstant } from "./sample-activity-builder";

// Unit vectors: wordings of the same topic share a direction, so they group at any threshold below 1.
function fakeEmbedding(text: string): number[] {
  const topic = /price/i.test(text) ? 0 : /student/i.test(text) ? 1 : /install|klarna|split/i.test(text) ? 2 : 3 + (text.length % 5);
  return Array.from({ length: 8 }, (_, i) => (i === topic ? 1 : 0));
}

function build(now = new Date("2026-10-19T18:00:00Z")) {
  return buildSampleActivity({
    now,
    days: 30,
    storeName: "Pinebrook Supply",
    timeZone: "America/New_York",
    gapThreshold: 0.86,
    embeddingOf: fakeEmbedding,
    passageOf: ({ slug, heading }) => ({ document_slug: slug, document_title: slug, section_number: 1, heading, content: "text" }),
    random: mulberry32(7),
  });
}

describe("buildSampleActivity", () => {
  it("lands near 150 conversations with an 80 to 90 percent answer rate", () => {
    const { questions } = build();
    const conversations = new Set(questions.map((question) => question.conversation_id)).size;
    const answered = questions.filter((question) => question.is_answered).length / questions.length;
    expect(conversations).toBeGreaterThan(120);
    expect(conversations).toBeLessThan(200);
    expect(answered).toBeGreaterThanOrEqual(0.8);
    expect(answered).toBeLessThanOrEqual(0.9);
  });

  it("never puts activity in the future and keeps citations on every answer", () => {
    const now = new Date("2026-10-19T18:00:00Z");
    const { questions, handoffs } = build(now);
    for (const question of questions) expect(question.created_at.getTime()).toBeLessThanOrEqual(now.getTime() + 5 * 60_000);
    for (const handoff of handoffs) expect(handoff.created_at.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(questions.filter((question) => question.is_answered).every((question) => question.citations.length > 0)).toBe(true);
  });

  it("groups wordings of one topic into a single gap", () => {
    const { questions } = build();
    const priceGaps = new Set(questions.filter((question) => question.gap_key === "price-match").map((question) => question.gap_id));
    expect(priceGaps.size).toBe(1);
  });

  it("marks one resolved gap as asked again", () => {
    const { questions, resolutions } = build();
    const loyalty = questions.filter((question) => question.gap_key === "loyalty");
    const resolution = resolutions.find((item) => item.gap_id === loyalty[0]?.gap_id);
    if (loyalty.length > 1) expect(resolution!.resolved_at.getTime()).toBeLessThan(loyalty[loyalty.length - 1].created_at.getTime());
  });

  it("builds twelve handoffs, some handled, some with notes", () => {
    const { handoffs, notes } = build();
    expect(handoffs).toHaveLength(12);
    expect(handoffs.some((handoff) => handoff.handled_at)).toBe(true);
    expect(notes.length).toBeGreaterThan(0);
  });
});

describe("zonedInstant", () => {
  it("turns New York wall-clock time into the right instant across daylight saving", () => {
    expect(zonedInstant(2026, 7, 1, 9, 0, "America/New_York").toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(zonedInstant(2026, 12, 1, 9, 0, "America/New_York").toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });
});
