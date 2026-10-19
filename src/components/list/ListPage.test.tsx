// Spec 003, shared list component.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListPage, type Column } from "./ListPage";

interface Row {
  id: string;
  name: string;
}

const columns: Column<Row>[] = [{ key: "name", header: "Name", cell: (row) => row.name }];

function respond(rows: Row[], total = rows.length, totalPages = 1) {
  return new Response(
    JSON.stringify({ success: true, message: "ok", data: { items: rows, pagination: { total, total_pages: totalPages } } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function renderList(props: Partial<React.ComponentProps<typeof ListPage<Row>>> = {}) {
  return render(
    <ListPage<Row>
      endpoint="/api/things"
      label="Things"
      columns={columns}
      rowsPath="items"
      rowKey={(row) => row.id}
      emptyMessage="No things yet."
      {...props}
    />,
  );
}

describe("ListPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads the first page with page and page_size", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => respond([{ id: "1", name: "Alpha" }]));
    vi.stubGlobal("fetch", fetchMock);
    renderList();

    expect(await screen.findByRole("cell", { name: "Alpha" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/things?page=1&page_size=20");
  });

  it("shows the empty message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond([])));
    renderList();
    expect(await screen.findByText("No things yet.")).toBeInTheDocument();
  });

  it("shows the error, clears rows, and retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, message: "Database is down" }), { status: 500 }))
      .mockResolvedValueOnce(respond([{ id: "1", name: "Alpha" }]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderList();

    expect(await screen.findByRole("alert")).toHaveTextContent("Database is down");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("cell", { name: "Alpha" })).toBeInTheDocument();
  });

  it("pages forward", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond([{ id: "1", name: "Alpha" }], 21, 2))
      .mockResolvedValueOnce(respond([{ id: "21", name: "Omega" }], 21, 2));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderList();

    await screen.findByRole("cell", { name: "Alpha" });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("cell", { name: "Omega" })).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[1][0])).toContain("page=2");
  });

  it("searches after a pause, not on every keystroke, and ignores one or two letters", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => respond([{ id: "1", name: "Alpha" }]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderList({ enableSearch: true, searchPlaceholder: "Search things" });
    await screen.findByRole("cell", { name: "Alpha" });

    await user.type(screen.getByRole("searchbox", { name: "Search things" }), "pr");
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.type(screen.getByRole("searchbox", { name: "Search things" }), "ice");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 1500 });
    expect(String(fetchMock.mock.calls[1][0])).toContain("search=price");
  });
});
