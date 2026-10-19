// Spec 005 B17 to B19, AC11, AC12.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setGapResolved, type GapRow } from "./adminApi";
import { GapReport } from "./GapReport";

vi.mock("./adminApi", () => ({ setGapResolved: vi.fn() }));

const weather: GapRow = {
  gap_id: "gap-1",
  question: "What's the weather in Lahore?",
  wordings: [
    { text: "What's the weather in Lahore?", times_asked: 4 },
    { text: "What is the weather in Lahore today?", times_asked: 2 },
  ],
  times_asked: 6,
  last_asked_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  daily_counts: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 1, 2],
  resolved_at: null,
  asked_again: false,
};

const giftWrap: GapRow = {
  gap_id: "gap-2",
  question: "Do you gift wrap?",
  wordings: [{ text: "Do you gift wrap?", times_asked: 3 }],
  times_asked: 3,
  last_asked_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  daily_counts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  resolved_at: "2026-10-01T10:00:00.000Z",
  asked_again: true,
};

function respond(gaps: GapRow[]) {
  return new Response(
    JSON.stringify({
      success: true,
      message: "ok",
      data: {
        gaps,
        summary: { questions: 40, answered: 30, unanswered: 10, handoffs_sent: 2, days: 30 },
        pagination: { total: gaps.length, total_pages: 1 },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const table = () => screen.findByRole("table", { name: "Questions Sourced AI couldn't answer" });

describe("GapReport", () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: string) => Promise<Response>>>;

  beforeEach(() => {
    fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => respond([weather, giftWrap]));
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(setGapResolved).mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shows the summary cards from the list response", async () => {
    render(<GapReport />);
    await table();
    const terms = screen.getAllByRole("term").map((term) => term.textContent);
    expect(terms).toEqual(["Questions asked", "Answered from the docs", "Not answered", "Handed to a person"]);
    expect(await screen.findByText("75%")).toBeInTheDocument();
  });

  it("groups wordings and lists them all when expanded", async () => {
    const user = userEvent.setup();
    render(<GapReport />);
    await table();

    expect(screen.getByText("+1 other wording")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show wordings for What's the weather in Lahore?" }));

    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("What's the weather in Lahore?");
    expect(items[0]).toHaveTextContent("Asked 4 times");
    expect(items[1]).toHaveTextContent("What is the weather in Lahore today?");
    expect(items[1]).toHaveTextContent("Asked 2 times");
  });

  it("labels a group asked again after it was marked, and draws its trend", async () => {
    render(<GapReport />);
    await table();
    expect(screen.getByText("Asked again since marked")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Asked 6 times in the last 14 days" })).toBeInTheDocument();
  });

  it("marks a doc written and reloads the list", async () => {
    vi.mocked(setGapResolved).mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    render(<GapReport />);
    await table();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Mark doc written: What's the weather in Lahore?" }));

    expect(setGapResolved).toHaveBeenCalledWith("gap-1", true);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain("status=open");
  });

  it("shows the failure and keeps the row", async () => {
    vi.mocked(setGapResolved).mockResolvedValue({ ok: false, message: "Something went wrong. Try again." });
    const user = userEvent.setup();
    render(<GapReport />);
    await table();

    await user.click(screen.getByRole("button", { name: "Mark doc written: Do you gift wrap?" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Mark doc written: Do you gift wrap?" })).toBeEnabled();
  });

  it("requests resolved gaps on the Doc written tab and offers Reopen", async () => {
    vi.mocked(setGapResolved).mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    render(<GapReport />);
    await table();
    expect(String(fetchMock.mock.calls[0][0])).toContain("status=open");

    fetchMock.mockImplementation(async () => respond([{ ...giftWrap, asked_again: false }]));
    await user.click(screen.getByRole("tab", { name: "Doc written" }));

    expect(screen.getByRole("tab", { name: "Doc written" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("status=resolved"));
    const reopen = await screen.findByRole("button", { name: "Reopen: Do you gift wrap?" });
    await user.click(reopen);
    expect(setGapResolved).toHaveBeenCalledWith("gap-2", false);
  });

  it("shows the Doc written empty message", async () => {
    fetchMock.mockImplementation(async () => respond([]));
    const user = userEvent.setup();
    render(<GapReport />);
    expect(await screen.findByText("No unanswered questions in the last 30 days.")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Doc written" }));
    expect(await screen.findByText("Nothing marked as doc written yet.")).toBeInTheDocument();
  });
});
