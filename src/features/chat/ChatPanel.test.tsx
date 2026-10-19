// Spec 002, chat panel states.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";
import { createHandoff } from "./handoffsApi";
import { askQuestion, type Answer } from "./questionsApi";

vi.mock("./questionsApi", () => ({ askQuestion: vi.fn() }));
vi.mock("./handoffsApi", () => ({ createHandoff: vi.fn() }));

const answered: Answer = {
  is_answered: true,
  text: "Yes. You can return it within 30 days if it isn't damaged.",
  citations: [
    {
      number: 1,
      document_slug: "returns-and-refunds",
      document_title: "Returns and refunds",
      section_number: 2,
      heading: "Used and opened items",
      content: "Used items are accepted if undamaged, minus a 10% restocking fee.",
    },
  ],
};

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.mocked(askQuestion).mockReset();
    vi.mocked(createHandoff).mockReset();
  });

  it("answers a suggested question and opens its source", async () => {
    vi.mocked(askQuestion).mockResolvedValue({ ok: true, answer: answered });
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole("button", { name: "Can I return a kettle I’ve already used?" }));
    expect(await screen.findByText(answered.text)).toBeInTheDocument();

    const source = screen.getByRole("button", { name: "Source 1: Returns and refunds" });
    await user.click(source);
    expect(source).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Source 1: Returns and refunds" })).toHaveTextContent(
      "10% restocking fee",
    );
  });

  it("sends a typed question with Enter", async () => {
    vi.mocked(askQuestion).mockResolvedValue({ ok: true, answer: answered });
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.type(screen.getByLabelText("Your question"), "Can I return a used kettle?{Enter}");
    expect(askQuestion).toHaveBeenCalledWith(
      "Can I return a used kettle?",
      expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
    );
    expect(screen.getByText("Can I return a used kettle?")).toBeInTheDocument();
  });

  it("shows a not-answered reply without sources", async () => {
    vi.mocked(askQuestion).mockResolvedValue({
      ok: true,
      answer: { is_answered: false, text: "I couldn't find that in Pinebrook Supply's help docs, so I won't guess.", citations: [] },
    });
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole("button", { name: "Do you price match?" }));
    expect(await screen.findByText(/so I won't guess/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Source/ })).not.toBeInTheDocument();
  });

  it("shows the busy message and lets the visitor try again", async () => {
    vi.mocked(askQuestion).mockResolvedValue({
      ok: false,
      code: "AI_RATE_LIMITED",
      message: "The demo is busy right now. Try again in a minute.",
    });
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole("button", { name: "Do you price match?" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The demo is busy right now");
    expect(screen.getByLabelText("Your question")).toBeEnabled();
  });

  it("keeps Talk to a person disabled until the first reply", async () => {
    vi.mocked(askQuestion).mockResolvedValue({ ok: true, answer: answered });
    const user = userEvent.setup();
    render(<ChatPanel />);

    const talk = screen.getByRole("button", { name: "Talk to a person" });
    expect(talk).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Can I return a kettle I\u2019ve already used?" }));
    await screen.findByText(answered.text);
    expect(talk).toBeEnabled();
  });

  it("hands the conversation off with an email and confirms it", async () => {
    vi.mocked(askQuestion).mockResolvedValue({
      ok: true,
      answer: { is_answered: false, text: "I couldn't find that in Pinebrook Supply's help docs, so I won't guess.", citations: [] },
    });
    vi.mocked(createHandoff).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole("button", { name: "Do you price match?" }));
    await screen.findByText(/so I won't guess/);
    const [inline] = screen.getAllByRole("button", { name: "Talk to a person" }).filter((button) => !button.hasAttribute("title"));
    await user.click(inline);

    const form = screen.getByRole("form", { name: "Talk to a person" });
    await user.type(within(form).getByLabelText("Your email (optional)"), "sam@example.com");
    await user.click(within(form).getByRole("button", { name: "Send to the team" }));

    expect(createHandoff).toHaveBeenCalledWith(vi.mocked(askQuestion).mock.calls[0][1], "sam@example.com");
    expect(await screen.findByText("Sent to the Pinebrook Supply team")).toBeInTheDocument();
    expect(screen.getByText("They\u2019ll reply to you at sam@example.com.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Team notified" })).toBeDisabled();
  });

  it("checks the email before sending and keeps the form open when Slack fails", async () => {
    vi.mocked(askQuestion).mockResolvedValue({ ok: true, answer: answered });
    vi.mocked(createHandoff).mockResolvedValue({
      ok: false,
      code: "HANDOFF_UNAVAILABLE",
      message: "Couldn\u2019t reach the team right now. Try again in a minute.",
    });
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole("button", { name: "Can I return a kettle I\u2019ve already used?" }));
    await screen.findByText(answered.text);
    await user.click(screen.getByRole("button", { name: "Talk to a person" }));
    const form = screen.getByRole("form", { name: "Talk to a person" });

    await user.type(within(form).getByLabelText("Your email (optional)"), "not-an-email");
    await user.click(within(form).getByRole("button", { name: "Send to the team" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("Enter a valid email");
    expect(createHandoff).not.toHaveBeenCalled();

    await user.clear(within(form).getByLabelText("Your email (optional)"));
    await user.click(within(form).getByRole("button", { name: "Send to the team" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("Couldn\u2019t reach the team");
    expect(within(form).getByRole("button", { name: "Send to the team" })).toBeEnabled();
  });
});
