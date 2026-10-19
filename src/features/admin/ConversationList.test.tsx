// Spec 005 B10 to B12, AC7.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationList } from "./ConversationList";
import { getConversation } from "./adminApi";

vi.mock("./adminApi", () => ({ getConversation: vi.fn() }));

const rows = [
  {
    conversation_id: "c1",
    started_at: "2026-10-18T09:00:00Z",
    last_message_at: "2026-10-18T09:05:00Z",
    first_question: "Do you ship to Canada?",
    questions: 2,
    answered: 2,
    handoff_id: null,
  },
  {
    conversation_id: "c2",
    started_at: "2026-10-17T09:00:00Z",
    last_message_at: "2026-10-17T09:05:00Z",
    first_question: "Can I return a used tent?",
    questions: 3,
    answered: 2,
    handoff_id: null,
  },
  {
    conversation_id: "c3",
    started_at: "2026-10-16T09:00:00Z",
    last_message_at: "2026-10-16T09:05:00Z",
    first_question: "My order never arrived",
    questions: 1,
    answered: 0,
    handoff_id: "h9",
  },
];

function respond(data: typeof rows) {
  return new Response(
    JSON.stringify({ success: true, message: "ok", data: { conversations: data, pagination: { total: data.length, total_pages: 1 } } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function rowFor(question: string) {
  return screen.getByRole("cell", { name: question }).closest("tr") as HTMLElement;
}

describe("ConversationList", () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: string) => Promise<Response>>>;

  beforeEach(() => {
    fetchMock = vi.fn<(url: string) => Promise<Response>>(async (url) =>
      respond(String(url).includes("status=handed_off") ? rows.filter((row) => row.handoff_id) : rows),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getConversation).mockReset();
  });

  it("renders each row with its outcome tag", async () => {
    render(<ConversationList />);

    await screen.findByRole("cell", { name: "Do you ship to Canada?" });
    expect(within(rowFor("Do you ship to Canada?")).getByText("All answered")).toBeInTheDocument();
    expect(within(rowFor("Can I return a used tent?")).getByText("Some not answered")).toBeInTheDocument();
    expect(within(rowFor("Can I return a used tent?")).getByRole("cell", { name: "2 of 3" })).toBeInTheDocument();
    expect(within(rowFor("My order never arrived")).getByText("Handed off")).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toContain("status=all");
  });

  it("requests status=handed_off from the Handed off tab", async () => {
    const user = userEvent.setup();
    render(<ConversationList />);
    await screen.findByRole("cell", { name: "Do you ship to Canada?" });

    await user.click(screen.getByRole("tab", { name: "Handed off" }));

    expect(screen.getByRole("tab", { name: "Handed off" })).toHaveAttribute("aria-selected", "true");
    expect(String(fetchMock.mock.lastCall?.[0])).toContain("status=handed_off");
    expect(await screen.findByRole("cell", { name: "My order never arrived" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "Do you ship to Canada?" })).not.toBeInTheDocument();
  });

  it("opens a row into the transcript with a link to its handoff", async () => {
    vi.mocked(getConversation).mockResolvedValue({
      ok: true,
      data: {
        conversation_id: "c3",
        started_at: "2026-10-16T09:00:00Z",
        handoff_id: "h9",
        messages: [
          {
            question: "My order never arrived",
            answer_text: "I couldn't find that in the docs.",
            is_answered: false,
            citations: [],
            created_at: "2026-10-16T09:00:00Z",
          },
        ],
      },
    });
    const user = userEvent.setup();
    render(<ConversationList />);
    await screen.findByRole("cell", { name: "My order never arrived" });

    await user.click(within(rowFor("My order never arrived")).getByRole("button", { name: /Open conversation started/ }));

    const panel = screen.getByRole("dialog", { name: "Conversation" });
    expect(await within(panel).findByRole("list", { name: "Conversation" })).toHaveTextContent("I couldn't find that in the docs.");
    expect(getConversation).toHaveBeenCalledWith("c3");
    expect(within(panel).getByRole("link", { name: "Open in inbox" })).toHaveAttribute("href", "/admin/handoffs?handoff=h9");
  });

  it("shows the load error in the panel", async () => {
    vi.mocked(getConversation).mockResolvedValue({ ok: false, message: "Couldn't load this conversation." });
    const user = userEvent.setup();
    render(<ConversationList />);
    await screen.findByRole("cell", { name: "Do you ship to Canada?" });

    await user.click(within(rowFor("Do you ship to Canada?")).getByRole("button", { name: /Open conversation started/ }));

    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("Couldn't load this conversation.");
  });
});
