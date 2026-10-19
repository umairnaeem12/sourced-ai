// Spec 001, landing page (amendment 2: live demo link).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoStore } from "./DemoStore";

describe("DemoStore", () => {
  it("says the store is fictional", () => {
    render(<DemoStore />);
    expect(screen.getByText(/fictional online store/i)).toBeInTheDocument();
  });

  it("links to the live demo chat", () => {
    render(<DemoStore />);
    expect(screen.getByText(/live chat is open/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try the live demo" })).toHaveAttribute("href", "/demo");
  });
});
