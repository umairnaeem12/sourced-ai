// Spec 001 amendment, FAQ (AC11).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { faqs } from "./content";
import { Faq } from "./Faq";

describe("Faq", () => {
  it("renders every question as a collapsed button", () => {
    render(<Faq />);
    for (const faq of faqs) {
      expect(screen.getByRole("button", { name: faq.question })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  it("reveals the answer when a question is activated", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const [first] = faqs;
    const button = screen.getByRole("button", { name: first.question });

    expect(screen.queryByText(first.answer)).not.toBeInTheDocument();
    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: first.question })).toHaveTextContent(first.answer);
  });

  it("closes the open answer when another question is opened", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const [first, second] = faqs;
    const firstButton = screen.getByRole("button", { name: first.question });
    const secondButton = screen.getByRole("button", { name: second.question });

    await user.click(firstButton);
    await user.click(secondButton);

    expect(firstButton).toHaveAttribute("aria-expanded", "false");
    expect(secondButton).toHaveAttribute("aria-expanded", "true");
  });

  it("closes an open answer when its own question is clicked again", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const button = screen.getByRole("button", { name: faqs[0].question });

    await user.click(button);
    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
