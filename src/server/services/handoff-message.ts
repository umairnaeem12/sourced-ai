import type { LoggedQuestion } from "../repositories/question-repository";

export interface SlackMessage {
  text: string;
  blocks: unknown[];
}

const MAX_EXCHANGES = 10;
// Slack rejects section text over 3,000 characters.
const MAX_SECTION_LENGTH = 2900;

// Customer text must not be able to ping the channel or inject links.
export function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function quote(text: string): string {
  return text
    .split("\n")
    .map((line) => `>${line}`)
    .join("\n");
}

interface HandoffMessageInput {
  storeName: string;
  conversationId: string;
  email: string | null;
  questions: LoggedQuestion[];
  isTest?: boolean;
}

export function buildHandoffMessage({ storeName, conversationId, email, questions, isTest = false }: HandoffMessageInput): SlackMessage {
  const unanswered = questions.filter((question) => !question.is_answered).length;
  const recent = questions.slice(-MAX_EXCHANGES);
  const skipped = questions.length - recent.length;

  const transcript = recent
    .map((entry) => {
      const marker = entry.is_answered ? "" : "  _(not answered)_";
      return `*Customer:*\n${quote(escapeSlack(entry.question))}\n*Sourced AI:*${marker}\n${quote(escapeSlack(entry.answer_text))}`;
    })
    .join("\n\n");

  const contact = email ? `<mailto:${escapeSlack(email)}|${escapeSlack(email)}>` : "No email left";

  return {
    text: `${isTest ? "Test alert: " : ""}A customer on ${storeName} asked for a person`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: isTest ? "Test alert" : "Customer asked for a person" } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Store*\n${escapeSlack(storeName)}` },
          { type: "mrkdwn", text: `*Reply to*\n${contact}` },
          { type: "mrkdwn", text: `*Questions asked*\n${questions.length}` },
          { type: "mrkdwn", text: `*Not answered*\n${unanswered}` },
        ],
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: truncate(
            skipped > 0 ? `_${skipped} earlier exchange(s) not shown_\n\n${transcript}` : transcript,
            MAX_SECTION_LENGTH,
          ),
        },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Sent by Sourced AI · conversation ${conversationId}` }],
      },
    ],
  };
}
