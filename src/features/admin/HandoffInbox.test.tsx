// Spec 005 B13 to B16, AC9, AC10.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HandoffDetail, HandoffRow } from "./adminApi";
import { addHandoffNote, getHandoff, setHandoffHandled } from "./adminApi";
import { HandoffInbox } from "./HandoffInbox";

const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
let search = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/admin/handoffs",
  useSearchParams: () => search,
}));

vi.mock("./adminApi", () => ({
  getHandoff: vi.fn(),
  addHandoffNote: vi.fn(),
  setHandoffHandled: vi.fn(),
}));

const row: HandoffRow = {
  id: "h1",
  conversation_id: "c1",
  created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  email: "sam@example.com",
  question_count: 2,
  is_handled: false,
  handled_at: null,
  notifications: [
    { channel: "slack", status: "failed", problem: "not_configured", error: "SLACK_WEBHOOK_URL is not set" },
  ],
};

const detail: HandoffDetail = {
  ...row,
  conversation: [
    {
      question: "Can I return a used kettle?",
      answer_text: "I couldn't find that in the docs.",
      is_answered: false,
      citations: [],
      created_at: row.created_at,
    },
  ],
  notes: [],
};

function respond(rows: HandoffRow[]) {
  return new Response(
    JSON.stringify({ success: true, message: "ok", data: { handoffs: rows, pagination: { total: rows.length, total_pages: 1 } } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

async function openFirstRow() {
  const user = userEvent.setup();
  render(<HandoffInbox />);
  await user.click(await screen.findByRole("button", { name: "Open conversation with sam@example.com" }));
  const panel = await screen.findByRole("dialog", { name: "sam@example.com" });
  await within(panel).findByRole("list", { name: "Conversation" });
  return { user, panel };
}

describe("HandoffInbox", () => {
  beforeEach(() => {
    search = new URLSearchParams();
    vi.stubGlobal("fetch", vi.fn(async () => respond([row])));
    vi.mocked(getHandoff).mockResolvedValue({ ok: true, data: detail });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows a missing Slack setting in plain language, never the raw error", async () => {
    render(<HandoffInbox />);
    expect(await screen.findByText("Slack isn't connected")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/admin/settings");
    expect(screen.queryByText(/SLACK_WEBHOOK_URL/)).not.toBeInTheDocument();
  });

  it("filters by status with the tabs", async () => {
    const user = userEvent.setup();
    render(<HandoffInbox />);
    await screen.findByText("sam@example.com");
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("status=open");

    await user.click(screen.getByRole("tab", { name: "Handled" }));
    expect(screen.getByRole("tab", { name: "Handled" })).toHaveAttribute("aria-selected", "true");
    expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain("status=handled");
  });

  it("opens a row in the side panel with the transcript and reply link", async () => {
    const { panel } = await openFirstRow();

    expect(getHandoff).toHaveBeenCalledWith("h1");
    expect(within(panel).getByText("Can I return a used kettle?")).toBeInTheDocument();
    expect(within(panel).getByText(/^Asked for a person/)).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Reply by email" })).toHaveAttribute(
      "href",
      `mailto:sam@example.com?subject=${encodeURIComponent("Re: your question to Pinebrook Supply")}`,
    );
    expect(router.replace).toHaveBeenCalledWith("/admin/handoffs?handoff=h1", { scroll: false });
  });

  it("opens the panel from ?handoff= and clears it on close", async () => {
    search = new URLSearchParams("handoff=h1");
    window.history.replaceState(null, "", "/admin/handoffs?handoff=h1");
    const user = userEvent.setup();
    render(<HandoffInbox />);

    const panel = await screen.findByRole("dialog", { name: "sam@example.com" });
    await within(panel).findByText("Can I return a used kettle?");
    await user.click(within(panel).getAllByRole("button", { name: "Close panel" })[0]);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.replace).toHaveBeenLastCalledWith("/admin/handoffs", { scroll: false });
    window.history.replaceState(null, "", "/");
  });

  it("can't submit an empty note", async () => {
    const { user, panel } = await openFirstRow();
    const submit = within(panel).getByRole("button", { name: "Add note" });

    expect(submit).toBeDisabled();
    await user.type(within(panel).getByLabelText("Add a note"), "   ");
    expect(submit).toBeDisabled();
    expect(addHandoffNote).not.toHaveBeenCalled();
  });

  it("adds a note and shows it", async () => {
    vi.mocked(addHandoffNote).mockResolvedValue({
      ok: true,
      data: { id: "n1", body: "Called them back.\nRefund sent.", created_at: new Date().toISOString() },
    });
    const { user, panel } = await openFirstRow();
    const field = within(panel).getByLabelText("Add a note");

    await user.type(field, "Called them back.{Enter}Refund sent.");
    expect(within(panel).getByText("30 / 2000")).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Add note" }));

    expect(addHandoffNote).toHaveBeenCalledWith("h1", "Called them back.\nRefund sent.");
    const notes = await within(panel).findByRole("list", { name: "Notes" });
    expect(within(notes).getByText(/Called them back\./)).toBeInTheDocument();
    expect(field).toHaveValue("");
  });

  it("shows why a note failed", async () => {
    vi.mocked(addHandoffNote).mockResolvedValue({ ok: false, message: "Notes can be at most 2,000 characters." });
    const { user, panel } = await openFirstRow();

    await user.type(within(panel).getByLabelText("Add a note"), "Hello");
    await user.click(within(panel).getByRole("button", { name: "Add note" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent("Notes can be at most 2,000 characters.");
  });

  it("marks the handoff handled and refreshes the list and sidebar count", async () => {
    vi.mocked(setHandoffHandled).mockResolvedValue({ ok: true, data: null });
    const { user, panel } = await openFirstRow();
    const fetchCalls = vi.mocked(fetch).mock.calls.length;

    await user.click(within(panel).getByRole("button", { name: "Mark handled" }));

    expect(setHandoffHandled).toHaveBeenCalledWith("h1", true);
    expect(await within(panel).findByRole("button", { name: "Reopen" })).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
    await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(fetchCalls));
  });
});
