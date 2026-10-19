// @vitest-environment node
// Spec 002, splitting docs into passages.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMarkdownDocument, parsePlainDocument, toPassages } from "./chunk-service";

describe("parseMarkdownDocument", () => {
  it("reads the title and numbers the sections from 1", () => {
    const parsed = parseMarkdownDocument("# Returns\n\n## Window\n\n30 days.\n\n## Fees\n\n10% if used.\n");
    expect(parsed.title).toBe("Returns");
    expect(parsed.sections).toEqual([
      { section_number: 1, heading: "Window", content: "30 days." },
      { section_number: 2, heading: "Fees", content: "10% if used." },
    ]);
  });

  it("rejects a document with no title", () => {
    expect(() => parseMarkdownDocument("## Window\n\n30 days.")).toThrow(/Title/);
  });

  it("keeps section 2 of the returns doc as the used-items policy the landing page quotes", async () => {
    const markdown = await readFile(
      path.join(process.cwd(), "content", "pinebrook", "returns-and-refunds.md"),
      "utf8",
    );
    const section = parseMarkdownDocument(markdown).sections[1];
    expect(section.section_number).toBe(2);
    expect(section.content).toContain("Used items are accepted if undamaged, minus a 10% restocking fee.");
  });
});

describe("toPassages", () => {
  it("splits a long section on paragraph breaks and keeps its number", () => {
    const long = ["a".repeat(60), "b".repeat(60), "c".repeat(60)].join("\n\n");
    const passages = toPassages(
      { title: "T", sections: [{ section_number: 3, heading: "H", content: long }] },
      130,
    );
    expect(passages.map((passage) => passage.content)).toEqual([
      `${"a".repeat(60)}\n\n${"b".repeat(60)}`,
      "c".repeat(60),
    ]);
    expect(passages.every((passage) => passage.section_number === 3)).toBe(true);
  });
});

describe("parsePlainDocument (spec 005)", () => {
  it("uses a short first line as the heading and numbers passages from 1", () => {
    const parsed = parsePlainDocument("Care guide", "Washing\nHand wash only.\n\nStorage\nKeep it dry.");
    expect(parsed.title).toBe("Care guide");
    expect(parsed.sections[0]).toEqual({ section_number: 1, heading: "Washing", content: "Hand wash only.\n\nStorage\nKeep it dry." });
  });

  it("falls back to the title when the text has no heading line", () => {
    const parsed = parsePlainDocument("Terms", "All sales are final after 30 days.");
    expect(parsed.sections[0].heading).toBe("Terms, part 1");
  });

  it("keeps every passage within the size limit, even for one long paragraph", () => {
    const text = Array.from({ length: 80 }, (_, i) => `Sentence number ${i} explains a policy detail.`).join(" ");
    const parsed = parsePlainDocument("Long", text, 300);
    expect(parsed.sections.length).toBeGreaterThan(5);
    for (const section of parsed.sections) expect(section.content.length).toBeLessThanOrEqual(300);
  });

  it("refuses text with nothing in it", () => {
    expect(() => parsePlainDocument("Empty", "  \n\n ")).toThrow(/no text/);
  });
});
