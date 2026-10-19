// Spec 005 B5 to B9, admin overview.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOverview, type Overview } from "./adminApi";
import { OverviewDashboard } from "./OverviewDashboard";

vi.mock("./adminApi", () => ({ getOverview: vi.fn() }));

function fixture(overrides: Partial<Overview> = {}): Overview {
  return {
    period: { days: 30, time_zone: "America/New_York" },
    totals: { conversations: 120, questions: 300, answered: 255, handoffs: 10, median_handle_minutes: 45 },
    previous_totals: { conversations: 100, questions: 300, answered: 246, handoffs: 8, median_handle_minutes: 90 },
    daily: [
      { date: "2026-10-18", answered: 9, unanswered: 1 },
      { date: "2026-10-19", answered: 7, unanswered: 2 },
    ],
    top_documents: [{ document_slug: "returns-and-refunds", document_title: "Returns and refunds", answers: 42 }],
    busiest: [{ weekday: 1, hour: 10, questions: 6 }],
    top_gaps: [
      {
        gap_id: "gap-1",
        question: "Do you ship to Iceland?",
        wordings: [{ text: "Do you ship to Iceland?", times_asked: 4 }],
        times_asked: 4,
        last_asked_at: "2026-10-18T12:00:00Z",
        daily_counts: Array(14).fill(0),
        resolved_at: null,
        asked_again: false,
      },
    ],
    recent_handoffs: [
      {
        id: "h-1",
        conversation_id: "c-1",
        created_at: "2026-10-18T12:00:00Z",
        email: "sam@example.com",
        question_count: 3,
        is_handled: false,
        handled_at: null,
        notifications: [],
      },
    ],
    has_sample_data: true,
    ...overrides,
  };
}

function tile(label: string): HTMLElement {
  return screen.getByText(label, { selector: "dt" }).parentElement as HTMLElement;
}

describe("OverviewDashboard", () => {
  beforeEach(() => {
    vi.mocked(getOverview).mockReset();
  });

  it("shows each headline number with its change against the previous period", async () => {
    vi.mocked(getOverview).mockResolvedValue({ ok: true, data: fixture() });
    render(<OverviewDashboard />);

    expect(await screen.findByText("120")).toBeInTheDocument();
    expect(getOverview).toHaveBeenCalledWith(30);

    expect(within(tile("Conversations")).getByText("+20%")).toBeInTheDocument();
    expect(within(tile("Conversations")).getByText("vs previous 30 days")).toBeInTheDocument();
    expect(within(tile("Questions")).getByText("300")).toBeInTheDocument();
    expect(within(tile("Questions")).getByText("No change")).toBeInTheDocument();
    expect(within(tile("Answer rate")).getByText("85%")).toBeInTheDocument();
    expect(within(tile("Answer rate")).getByText("+3 pts")).toBeInTheDocument();
    expect(within(tile("Handoffs")).getByText("10")).toBeInTheDocument();
    expect(within(tile("Handoffs")).getByText("+25%")).toBeInTheDocument();
    expect(within(tile("Median time to handle")).getByText("45 min")).toBeInTheDocument();
    expect(within(tile("Median time to handle")).getByText("-45 min")).toBeInTheDocument();
  });

  it("marks new activity and leaves rates without data blank", async () => {
    const empty = { conversations: 0, questions: 0, answered: 0, handoffs: 0, median_handle_minutes: null };
    vi.mocked(getOverview).mockResolvedValue({
      ok: true,
      data: fixture({
        totals: { ...empty, conversations: 4 },
        previous_totals: empty,
        daily: [{ date: "2026-10-19", answered: 0, unanswered: 0 }],
        top_documents: [],
        busiest: [],
      }),
    });
    render(<OverviewDashboard />);

    expect(await screen.findByText("No data")).toBeInTheDocument();
    expect(within(tile("Conversations")).getByText("New")).toBeInTheDocument();
    expect(within(tile("Answer rate")).getByText("No data")).toBeInTheDocument();
    expect(within(tile("Median time to handle")).getByText("None handled")).toBeInTheDocument();
    expect(within(tile("Handoffs")).queryByText("vs previous 30 days")).not.toBeInTheDocument();
    expect(screen.getAllByText("No questions in this period")).toHaveLength(3);
  });

  it("refetches when the period changes", async () => {
    vi.mocked(getOverview)
      .mockResolvedValueOnce({ ok: true, data: fixture() })
      .mockResolvedValueOnce({ ok: true, data: fixture({ period: { days: 7, time_zone: "America/New_York" } }) });
    const user = userEvent.setup();
    render(<OverviewDashboard />);

    const picker = screen.getByRole("radiogroup", { name: "Period" });
    expect(within(picker).getByRole("radio", { name: "Last 30 days" })).toHaveAttribute("aria-checked", "true");
    await screen.findByText("120");

    await user.click(within(picker).getByRole("radio", { name: "Last 7 days" }));
    expect(getOverview).toHaveBeenLastCalledWith(7);
    expect(within(picker).getByRole("radio", { name: "Last 7 days" })).toHaveAttribute("aria-checked", "true");
    expect((await screen.findAllByText("vs previous 7 days")).length).toBeGreaterThan(0);
  });

  it("moves through periods with the arrow keys", async () => {
    vi.mocked(getOverview).mockResolvedValue({ ok: true, data: fixture() });
    const user = userEvent.setup();
    render(<OverviewDashboard />);
    await screen.findByText("120");

    screen.getByRole("radio", { name: "Last 30 days" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Last 90 days" })).toHaveFocus();
    expect(getOverview).toHaveBeenLastCalledWith(90);
  });

  it("shows the error and tries again", async () => {
    vi.mocked(getOverview)
      .mockResolvedValueOnce({ ok: false, message: "Something went wrong. Try again." })
      .mockResolvedValueOnce({ ok: true, data: fixture() });
    const user = userEvent.setup();
    render(<OverviewDashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("120")).toBeInTheDocument();
    expect(getOverview).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lists open gaps and handoffs with links to their pages", async () => {
    vi.mocked(getOverview).mockResolvedValue({ ok: true, data: fixture() });
    render(<OverviewDashboard />);

    expect(await screen.findByText("Do you ship to Iceland?")).toBeInTheDocument();
    expect(screen.getByText("Asked 4 times")).toBeInTheDocument();
    expect(screen.getByText("sam@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View gap report" })).toHaveAttribute("href", "/admin/gaps");
    expect(screen.getByRole("link", { name: "Open inbox" })).toHaveAttribute("href", "/admin/handoffs");
    expect(screen.getByRole("list", { name: "Most cited docs" })).toHaveTextContent("42 answers");
  });

  it("says so when there are no open gaps or handoffs", async () => {
    vi.mocked(getOverview).mockResolvedValue({ ok: true, data: fixture({ top_gaps: [], recent_handoffs: [] }) });
    render(<OverviewDashboard />);

    expect(await screen.findByText("No open gaps. Every question in this period was answered.")).toBeInTheDocument();
    expect(screen.getByText("No open handoffs.")).toBeInTheDocument();
  });
});
