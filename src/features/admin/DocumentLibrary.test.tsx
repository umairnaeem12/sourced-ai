// Spec 005 B20 to B24: the documents page.
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDocument, getDocument, saveDocument, type DocumentRow } from "./adminApi";
import { DocumentLibrary } from "./DocumentLibrary";

vi.mock("./adminApi");

const recent = new Date(Date.now() - 2 * 3600 * 1000).toISOString();

const rows: DocumentRow[] = [
  {
    id: "doc-1",
    slug: "shipping",
    title: "Shipping and delivery",
    origin: "sample",
    source_filename: null,
    char_count: 4200,
    passage_count: 6,
    created_at: recent,
    updated_at: recent,
  },
  {
    id: "doc-2",
    slug: "warranty",
    title: "Warranty",
    origin: "upload",
    source_filename: "warranty.md",
    char_count: 900,
    passage_count: 3,
    created_at: recent,
    updated_at: recent,
  },
];

function respond(documents: DocumentRow[], total = documents.length) {
  return new Response(
    JSON.stringify({ success: true, message: "ok", data: { documents, limit: 25, pagination: { total, total_pages: 1 } } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const saved: DocumentRow = { ...rows[1], id: "doc-3", title: "Returns", source_filename: "returns.md", passage_count: 4 };

async function openAddPanel(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText("Shipping and delivery");
  await user.click(screen.getByRole("button", { name: "Add document" }));
  return screen.getByRole("dialog", { name: "Add document" });
}

describe("DocumentLibrary", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => respond(rows));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("lists documents with passages, source and the limit", async () => {
    render(<DocumentLibrary />);

    const warranty = (await screen.findByText("Warranty")).closest("tr")!;
    expect(within(warranty).getByText("3")).toBeInTheDocument();
    expect(within(warranty).getByText("Uploaded")).toBeInTheDocument();
    expect(within(warranty).getByText("warranty.md")).toBeInTheDocument();
    const shipping = screen.getByText("Shipping and delivery").closest("tr")!;
    expect(within(shipping).getByText("6")).toBeInTheDocument();
    expect(within(shipping).getByText("Sample doc")).toBeInTheDocument();
    expect(screen.getByText("2 of 25 documents")).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/admin/documents?");
  });

  it("uploads a Markdown file and announces the result", async () => {
    vi.mocked(saveDocument).mockResolvedValue({ ok: true, data: saved });
    const user = userEvent.setup();
    render(<DocumentLibrary />);
    const dialog = await openAddPanel(user);

    const file = new File(["# Returns\n\n## Window\n30 days."], "returns.md", { type: "text/markdown" });
    await user.upload(within(dialog).getByLabelText("Document file"), file);
    expect(within(dialog).getByText("returns.md")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Add document" }));

    expect(saveDocument).toHaveBeenCalledOnce();
    const [form, id] = vi.mocked(saveDocument).mock.calls[0];
    expect(id).toBeUndefined();
    expect(form.get("file")).toBe(file);
    expect(form.has("title")).toBe(false);
    expect(await screen.findByRole("status")).toHaveTextContent("Added Returns with 4 passages.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refuses a .docx before calling the API", async () => {
    const user = userEvent.setup();
    render(<DocumentLibrary />);
    const dialog = await openAddPanel(user);

    const file = new File(["binary"], "returns.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const dropZone = within(dialog).getByLabelText("Document file").closest("label")!;
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(within(dialog).getByRole("alert")).toHaveTextContent("Choose a .md, .txt or .pdf file.");
    await user.click(within(dialog).getByRole("button", { name: "Add document" }));
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it("requires a title for pasted text", async () => {
    const user = userEvent.setup();
    render(<DocumentLibrary />);
    const dialog = await openAddPanel(user);

    await user.click(within(dialog).getByRole("radio", { name: "Paste text" }));
    await user.type(within(dialog).getByLabelText("Text"), "Orders ship in two days.");
    await user.click(within(dialog).getByRole("button", { name: "Add document" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent("Add a title for the pasted text.");
    expect(saveDocument).not.toHaveBeenCalled();

    vi.mocked(saveDocument).mockResolvedValue({ ok: true, data: saved });
    await user.type(within(dialog).getByLabelText("Title"), "Returns");
    await user.click(within(dialog).getByRole("button", { name: "Add document" }));
    const form = vi.mocked(saveDocument).mock.calls[0][0];
    expect(form.get("title")).toBe("Returns");
    expect(form.get("text")).toBe("Orders ship in two days.");
  });

  it("shows the server's refusal in an alert", async () => {
    vi.mocked(saveDocument).mockResolvedValue({ ok: false, message: "We couldn't find any text in this file." });
    const user = userEvent.setup();
    render(<DocumentLibrary />);
    const dialog = await openAddPanel(user);

    await user.upload(within(dialog).getByLabelText("Document file"), new File(["%PDF-1.4"], "scan.pdf", { type: "application/pdf" }));
    await user.click(within(dialog).getByRole("button", { name: "Add document" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("We couldn't find any text in this file.");
    expect(screen.getByRole("dialog", { name: "Add document" })).toBeInTheDocument();
  });

  it("disables adding when the library is full", async () => {
    fetchMock.mockImplementation(async () => respond(rows, 25));
    const user = userEvent.setup();
    render(<DocumentLibrary />);
    const dialog = await openAddPanel(user);

    expect(within(dialog).getByText(/You have 25 of 25 documents/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add document" })).toBeDisabled();
  });

  it("opens a document's passages and deletes it after confirmation", async () => {
    vi.mocked(getDocument).mockResolvedValue({
      ok: true,
      data: { ...rows[1], passages: [{ section_number: 1, heading: "Coverage", content: "Two years on every tent." }] },
    });
    vi.mocked(deleteDocument).mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    render(<DocumentLibrary />);

    await screen.findByText("Warranty");
    await user.click(screen.getByRole("button", { name: "Open Warranty" }));
    const dialog = screen.getByRole("dialog", { name: "Warranty" });
    expect(within(dialog).getByText(/3 passages · Uploaded · updated/)).toBeInTheDocument();
    expect(await within(dialog).findByText("Two years on every tent.")).toBeInTheDocument();
    expect(getDocument).toHaveBeenCalledWith("doc-2");

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(within(dialog).getByText(/The chat stops using it right away/)).toBeInTheDocument();
    expect(deleteDocument).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Delete document" }));

    expect(deleteDocument).toHaveBeenCalledWith("doc-2");
    expect(await screen.findByRole("status")).toHaveTextContent("Deleted Warranty.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("replaces a document with the same form", async () => {
    vi.mocked(getDocument).mockResolvedValue({ ok: true, data: { ...rows[1], passages: [] } });
    vi.mocked(saveDocument).mockResolvedValue({ ok: true, data: { ...rows[1], passage_count: 5 } });
    const user = userEvent.setup();
    render(<DocumentLibrary />);

    await screen.findByText("Warranty");
    await user.click(screen.getByRole("button", { name: "Open Warranty" }));
    const dialog = screen.getByRole("dialog", { name: "Warranty" });
    await user.click(within(dialog).getByRole("button", { name: "Replace" }));
    const file = new File(["# Warranty\n\n## Coverage\nFive years."], "warranty.md", { type: "text/markdown" });
    await user.upload(within(dialog).getByLabelText("Document file"), file);
    await user.click(within(dialog).getByRole("button", { name: "Replace document" }));

    const [form, id] = vi.mocked(saveDocument).mock.calls[0];
    expect(id).toBe("doc-2");
    expect(form.get("file")).toBe(file);
    expect(await screen.findByRole("status")).toHaveTextContent("Replaced Warranty with 5 passages.");
  });
});
