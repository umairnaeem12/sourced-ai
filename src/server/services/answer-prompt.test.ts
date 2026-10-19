// @vitest-environment node
// Spec 002, AC4: only answers backed by a passage that was sent count.
import { describe, expect, it } from "vitest";
import { buildAnswerPrompt, parseModelAnswer } from "./answer-prompt";

const reply = (value: unknown) => JSON.stringify(value);

describe("parseModelAnswer", () => {
  it("keeps valid citations, sorted and de-duplicated", () => {
    expect(parseModelAnswer(reply({ is_answered: true, answer: "Yes.", citations: [2, 1, 2] }), 4)).toEqual({
      is_answered: true,
      text: "Yes.",
      cited: [1, 2],
    });
  });

  it("drops citations to passages that were never sent", () => {
    expect(parseModelAnswer(reply({ is_answered: true, answer: "Yes.", citations: [1, 9] }), 4).cited).toEqual([1]);
  });

  it("treats an answer with no valid citation as not answered", () => {
    expect(parseModelAnswer(reply({ is_answered: true, answer: "Yes.", citations: [9] }), 4).is_answered).toBe(false);
  });

  it("respects the model saying the passages don't answer it", () => {
    expect(parseModelAnswer(reply({ is_answered: false, answer: "", citations: [] }), 4).is_answered).toBe(false);
  });

  it("accepts JSON wrapped in a code fence", () => {
    const raw = "```json\n" + reply({ is_answered: true, answer: "Yes.", citations: [1] }) + "\n```";
    expect(parseModelAnswer(raw, 1).is_answered).toBe(true);
  });

  it("treats malformed output as not answered", () => {
    expect(parseModelAnswer("Sure! Returns are fine.", 4).is_answered).toBe(false);
  });
});

describe("buildAnswerPrompt", () => {
  it("numbers the passages and keeps the question in the user message", () => {
    const prompt = buildAnswerPrompt("Pinebrook Supply", "Do you price match?", [
      {
        id: "p1",
        document_slug: "returns-and-refunds",
        document_title: "Returns and refunds",
        section_number: 1,
        heading: "Return window",
        content: "30 days.",
        similarity: 0.8,
      },
    ]);
    expect(prompt.system).toContain("Pinebrook Supply");
    expect(prompt.user).toContain("[1] Returns and refunds > Return window\n30 days.");
    expect(prompt.user).toContain("Customer question: Do you price match?");
    expect(prompt.system).not.toContain("Do you price match?");
  });
});
