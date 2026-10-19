// @vitest-environment node
// Spec 003, Slack handoff message.
import { describe, expect, it } from "vitest";
import type { LoggedQuestion } from "../repositories/question-repository";
import { buildHandoffMessage, escapeSlack } from "./handoff-message";

const logged = (question: string, is_answered: boolean, answer_text = "An answer."): LoggedQuestion => ({
  question,
  is_answered,
  answer_text,
  citations: [],
  created_at: new Date("2026-10-17T10:00:00Z"),
});

const conversationId = "6f1d4c2a-1b2c-4d3e-8f9a-0b1c2d3e4f5a";

function sectionTexts(message: ReturnType<typeof buildHandoffMessage>): string {
  return JSON.stringify(message.blocks);
}

describe("escapeSlack", () => {
  it("neutralises mentions and links", () => {
    expect(escapeSlack("<!channel> & <https://evil.example|click>")).toBe(
      "&lt;!channel&gt; &amp; &lt;https://evil.example|click&gt;",
    );
  });
});

describe("buildHandoffMessage", () => {
  it("includes the email, counts and the escaped conversation", () => {
    const message = buildHandoffMessage({
      storeName: "Pinebrook Supply",
      conversationId,
      email: "sam@example.com",
      questions: [logged("Can I return it?", true), logged("<!here> price match?", false, "I won't guess.")],
    });
    const blocks = sectionTexts(message);

    expect(message.text).toBe("A customer on Pinebrook Supply asked for a person");
    expect(blocks).toContain("mailto:sam@example.com");
    expect(blocks).toContain("*Questions asked*\\n2");
    expect(blocks).toContain("*Not answered*\\n1");
    expect(blocks).toContain("&lt;!here&gt; price match?");
    expect(blocks).not.toContain("<!here>");
    expect(blocks).toContain(conversationId);
  });

  it("says so when no email was left", () => {
    const message = buildHandoffMessage({ storeName: "Pinebrook Supply", conversationId, email: null, questions: [logged("q", true)] });
    expect(sectionTexts(message)).toContain("No email left");
  });

  it("keeps only the last 10 exchanges and stays under Slack's section limit", () => {
    const questions = Array.from({ length: 14 }, (_, i) => logged(`Question ${i + 1} ${"x".repeat(300)}`, true, "y".repeat(300)));
    const message = buildHandoffMessage({ storeName: "Pinebrook Supply", conversationId, email: null, questions });
    const transcript = (message.blocks[3] as { text: { text: string } }).text.text;

    expect(transcript).toContain("4 earlier exchange(s) not shown");
    expect(transcript).not.toContain("Question 4 ");
    expect(transcript.length).toBeLessThanOrEqual(2900);
  });
});
