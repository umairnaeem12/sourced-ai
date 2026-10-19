// Spec 001 amendment, comparison (AC12).
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Comparison } from "./Comparison";
import { features } from "./content";

describe("Comparison", () => {
  it("has one row per feature", () => {
    render(<Comparison />);
    const table = screen.getByRole("table", { name: /generic ai chatbot compared with sourced ai/i });
    const rowHeaders = within(table).getAllByRole("rowheader");
    expect(rowHeaders.map((cell) => cell.textContent)).toEqual([
      features[0].title,
      features[1].title,
      features[2].title,
      features[3].title,
      "AI provider",
    ]);
  });
});
