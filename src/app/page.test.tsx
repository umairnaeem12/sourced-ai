// Spec 001, landing page.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("landing page", () => {
  it("has a single h1 that names the product", () => {
    render(<Home />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Sourced AI");
  });

  it("links the hero calls to action to their sections", () => {
    render(<Home />);
    for (const link of screen.getAllByRole("link", { name: "Try the live demo" })) {
      expect(link).toHaveAttribute("href", "/demo");
    }
    expect(
      screen.getAllByRole("link", { name: "How it works" }).map((link) => link.getAttribute("href")),
    ).toContain("#how-it-works");
  });
});
