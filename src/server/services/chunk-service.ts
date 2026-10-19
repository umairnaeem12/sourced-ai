export interface DocumentSection {
  section_number: number;
  heading: string;
  content: string;
}

export interface ParsedDocument {
  title: string;
  sections: DocumentSection[];
}

const MAX_PASSAGE_LENGTH = 1200;

// Expects one "# Title" line, then "## Heading" sections. Section numbers count from 1.
export function parseMarkdownDocument(markdown: string): ParsedDocument {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1].trim();
  if (!title) throw new Error("Document has no '# Title' line");

  const sections = markdown
    .split(/^##\s+/m)
    .slice(1)
    .map((block, i) => {
      const [headingLine, ...rest] = block.split("\n");
      return { section_number: i + 1, heading: headingLine.trim(), content: rest.join("\n").trim() };
    })
    .filter((section) => section.content);

  if (sections.length === 0) throw new Error(`Document "${title}" has no '## ' sections`);
  return { title, sections };
}

// Long sections are split on paragraph breaks; the pieces keep the section's number.
export function toPassages(document: ParsedDocument, maxLength = MAX_PASSAGE_LENGTH): DocumentSection[] {
  return document.sections.flatMap((section) => {
    if (section.content.length <= maxLength) return [section];

    const pieces: string[] = [];
    let current = "";
    for (const paragraph of section.content.split(/\n\s*\n/)) {
      if (current && current.length + paragraph.length + 2 > maxLength) {
        pieces.push(current);
        current = paragraph;
      } else {
        current = current ? `${current}\n\n${paragraph}` : paragraph;
      }
    }
    if (current) pieces.push(current);
    return pieces.map((content) => ({ ...section, content }));
  });
}

const MAX_HEADING_LENGTH = 80;

// Pieces no longer than maxLength, broken at paragraphs, then lines, then sentences.
function pack(text: string, maxLength: number): string[] {
  const units = text
    .split(/\n\s*\n/)
    .flatMap((paragraph) => (paragraph.length <= maxLength ? [paragraph] : paragraph.split(/\n/)))
    .flatMap((line) => (line.length <= maxLength ? [line] : line.match(/[^.!?]+[.!?]*\s*/g) ?? [line]))
    .flatMap((piece) => (piece.length <= maxLength ? [piece] : piece.match(new RegExp(`.{1,${maxLength}}`, "gs")) ?? []))
    .map((unit) => unit.trim())
    .filter(Boolean);

  const pieces: string[] = [];
  let current = "";
  for (const unit of units) {
    if (current && current.length + unit.length + 2 > maxLength) {
      pieces.push(current);
      current = unit;
    } else {
      current = current ? `${current}\n\n${unit}` : unit;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

// Spec 005: plain text and PDFs have no "##" headings, so passages are cut by size.
// A short first line ("Gift cards") becomes the heading; otherwise "<title>, part N".
export function parsePlainDocument(title: string, text: string, maxLength = MAX_PASSAGE_LENGTH): ParsedDocument {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  const sections = pack(normalized, maxLength).map((piece, i) => {
    const [firstLine, ...rest] = piece.split("\n");
    const body = rest.join("\n").trim();
    const isHeading = firstLine.length <= MAX_HEADING_LENGTH && !/[.!?,;:]$/.test(firstLine) && body.length > 0;
    return {
      section_number: i + 1,
      heading: isHeading ? firstLine.trim() : `${title}, part ${i + 1}`,
      content: isHeading ? body : piece,
    };
  });
  if (sections.length === 0) throw new Error(`Document "${title}" has no text`);
  return { title, sections };
}
