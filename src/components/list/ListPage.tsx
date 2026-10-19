"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface Column<Row> {
  key: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
  // Drops the column below the sm breakpoint so phones don't scroll sideways.
  hideOnMobile?: boolean;
}

interface ListPageProps<Row> {
  endpoint: string;
  columns: Column<Row>[];
  rowsPath: string;
  rowKey: (row: Row) => string;
  label: string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  refreshKey?: number;
  // Receives the whole `data` object, for screens that show more than the rows (summary cards).
  onData?: (data: Record<string, unknown>) => void;
  unauthorizedRedirect?: string;
  // Extra query parameters, e.g. a status tab. Changing them goes back to page 1.
  params?: Record<string, string>;
  // Opt-in expandable rows. `refresh` reloads the list after the panel changes a row.
  renderExpanded?: (row: Row, controls: { refresh: () => void }) => React.ReactNode;
  expandLabel?: (row: Row) => string;
  // Opt-in row opening (spec 005): the page shows the row in a side panel. Not combined with renderExpanded.
  onRowOpen?: (row: Row) => void;
  openLabel?: (row: Row) => string;
  selectedKey?: string | null;
  // Controls shown at the start of the toolbar, e.g. status tabs.
  toolbar?: React.ReactNode;
  // Off when the page shows its own count (documents: "5 of 25").
  showCount?: boolean;
}

type Status = "loading" | "ready" | "error";

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_MIN_LENGTH = 3;

function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], source);
}

export function ListPage<Row>({
  endpoint,
  columns,
  rowsPath,
  rowKey,
  label,
  enableSearch = false,
  searchPlaceholder = "Search",
  pageSize = 20,
  emptyMessage = "Nothing here yet.",
  refreshKey = 0,
  onData,
  unauthorizedRedirect,
  params,
  renderExpanded,
  expandLabel = () => "Show details",
  onRowOpen,
  openLabel = () => "Open",
  selectedKey = null,
  toolbar,
  showCount = true,
}: ListPageProps<Row>) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<Status>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const panelBaseId = useId();
  const paramsKey = JSON.stringify(params ?? {});
  const [lastParamsKey, setLastParamsKey] = useState(paramsKey);
  if (paramsKey !== lastParamsKey) {
    setLastParamsKey(paramsKey);
    setPage(1);
    setExpandedKey(null);
  }
  const lastKey = useRef<string | null>(null);
  const onDataRef = useRef(onData);
  useEffect(() => {
    onDataRef.current = onData;
  });

  // Search fires at 3+ characters or when cleared, so short typos don't hit the API.
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length > 0 && trimmed.length < SEARCH_MIN_LENGTH) return;
    const timer = setTimeout(() => {
      setQuery(trimmed);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const key = `${page}|${query}|${pageSize}|${paramsKey}|${refreshKey}|${retry}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    const controller = new AbortController();
    setRefreshing(true);
    const search = new URLSearchParams({ ...(JSON.parse(paramsKey) as Record<string, string>), page: String(page), page_size: String(pageSize) });
    if (query) search.set("search", query);

    fetch(`${endpoint}?${search}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401 && unauthorizedRedirect) {
          window.location.assign(unauthorizedRedirect);
          return;
        }
        const body = (await response.json()) as { success?: boolean; message?: string; data?: unknown };
        if (!response.ok || !body.success) throw new Error(body.message ?? `Request failed (${response.status})`);

        const data = (body.data ?? {}) as Record<string, unknown>;
        const nextRows = readPath(data, rowsPath);
        setRows(Array.isArray(nextRows) ? (nextRows as Row[]) : []);
        setTotal(Number(readPath(data, "pagination.total") ?? 0));
        setTotalPages(Math.max(1, Number(readPath(data, "pagination.total_pages") ?? 1)));
        setStatus("ready");
        setErrorMessage(null);
        onDataRef.current?.(data);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // Clear stale rows so an error can't be mistaken for the new result.
        setRows([]);
        setTotal(0);
        setTotalPages(1);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Couldn't load this list.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });

    return () => {
      controller.abort();
      // Lets a remount (React strict mode, navigation back) fetch again.
      lastKey.current = null;
    };
  }, [endpoint, page, query, pageSize, paramsKey, refreshKey, retry, rowsPath, unauthorizedRedirect]);

  const firstLoad = status === "loading";
  const hasActionColumn = Boolean(renderExpanded || onRowOpen);
  const columnCount = columns.length + (hasActionColumn ? 1 : 0);
  const refresh = () => setRetry((count) => count + 1);

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        {toolbar}
        {enableSearch ? (
          <label className="relative min-w-0 flex-1 sm:max-w-xs">
            <span className="sr-only">{searchPlaceholder}</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 fill-none stroke-current stroke-[1.8] text-faint"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4 4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-full border border-line bg-bg py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent"
            />
          </label>
        ) : (
          !toolbar && <span />
        )}
        <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
          {refreshing && !firstLoad && (
            <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-line border-t-accent" />
          )}
          {status === "ready" && showCount && `${total} ${total === 1 ? "row" : "rows"}`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className={cn("w-full text-left text-sm transition-opacity", refreshing && !firstLoad && "opacity-60")}>
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr className="border-b border-line text-xs text-faint">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 font-medium whitespace-nowrap sm:px-5",
                    column.align === "right" && "text-right",
                    column.hideOnMobile && "hidden sm:table-cell",
                  )}
                >
                  {column.header}
                </th>
              ))}
              {hasActionColumn && (
                <th scope="col" className="w-12 px-2">
                  <span className="sr-only">Details</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {firstLoad &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-line last:border-0" aria-hidden="true">
                  {Array.from({ length: columnCount }, (_, j) => (
                    <td key={j} className="px-4 py-4 sm:px-5">
                      <span className="block h-3 w-3/4 animate-pulse rounded-full bg-surface-2" />
                    </td>
                  ))}
                </tr>
              ))}

            {status === "error" && (
              <tr>
                <td colSpan={columnCount} className="px-5 py-12 text-center">
                  <p role="alert" className="text-sm text-cite">
                    {errorMessage}
                  </p>
                  <button
                    type="button"
                    onClick={refresh}
                    className="mt-3 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
                  >
                    Try again
                  </button>
                </td>
              </tr>
            )}

            {status === "ready" && rows.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-5 py-12 text-center text-sm text-muted">
                  {query ? `Nothing matches “${query}”.` : emptyMessage}
                </td>
              </tr>
            )}

            {status === "ready" &&
              rows.map((row) => {
                const key = rowKey(row);
                const expanded = expandedKey === key;
                const selected = selectedKey === key;
                const panelId = `${panelBaseId}-${key}`;
                return (
                  <Fragment key={key}>
                    <tr
                      // The open button is the accessible control; a click anywhere on the row is a mouse shortcut.
                      onClick={
                        onRowOpen
                          ? (event) => {
                              if ((event.target as HTMLElement).closest("a, button, input, summary")) return;
                              onRowOpen(row);
                            }
                          : undefined
                      }
                      className={cn(
                        "border-b border-line transition-colors last:border-0 hover:bg-bg/60",
                        (expanded || selected) && "bg-bg/60",
                        onRowOpen && "cursor-pointer",
                      )}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "px-4 py-3.5 align-top sm:px-5",
                            column.align === "right" && "text-right",
                            column.hideOnMobile && "hidden sm:table-cell",
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                      {onRowOpen && (
                        <td className="px-2 py-2.5 text-right align-top">
                          <button
                            type="button"
                            aria-label={openLabel(row)}
                            onClick={() => onRowOpen(row)}
                            className="inline-flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2">
                              <path d="M9.5 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </td>
                      )}
                      {renderExpanded && (
                        <td className="px-2 py-2.5 text-right align-top">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-controls={panelId}
                            aria-label={expandLabel(row)}
                            onClick={() => setExpandedKey(expanded ? null : key)}
                            className="inline-flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              className={cn("size-4 fill-none stroke-current stroke-2 transition-transform", expanded && "rotate-180")}
                            >
                              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                    {renderExpanded && expanded && (
                      <tr id={panelId} className="border-b border-line bg-bg/60 last:border-0">
                        <td colSpan={columnCount} className="px-4 pb-5 sm:px-5">
                          {renderExpanded(row, { refresh })}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      {status === "ready" && totalPages > 1 && (
        <nav aria-label={`${label} pages`} className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-muted sm:px-5">
          <span>
            Page {page} of {totalPages}
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || refreshing}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-full border border-line px-3 py-1.5 font-medium enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || refreshing}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-full border border-line px-3 py-1.5 font-medium enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-50"
            >
              Next
            </button>
          </span>
        </nav>
      )}
    </div>
  );
}
