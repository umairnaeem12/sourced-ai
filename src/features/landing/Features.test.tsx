// Spec 001, landing page.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Features } from "./Features";

describe("Features", () => {
  it("shows exactly five feature cards", () => {
    render(<Features />);
    const section = screen.getByRole("region", { name: /answers your team can trust/i });
    expect(within(section).getAllByRole("listitem")).toHaveLength(5);
  });
});
