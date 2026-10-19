"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListPage, type Column } from "@/components/list/ListPage";
import { cn } from "@/lib/cn";
import type { HandoffRow } from "./adminApi";
import { ChannelStatusList } from "./ChannelStatus";
import { fullDate, timeAgo } from "./format";
import { HandoffDetail, StatusPill } from "./HandoffDetail";

type Tab = "open" | "handled" | "all";

const tabs: { value: Tab; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "handled", label: "Handled" },
  { value: "all", label: "All" },
];

const emptyMessages: Record<Tab, string> = {
  open: "Nothing waiting. Every handoff has been handled.",
  handled: "Nothing handled yet.",
  all: "No handoffs yet. They appear here when a customer asks for a person.",
};

const columns: Column<HandoffRow>[] = [
  {
    key: "created_at",
    header: "When",
    className: "whitespace-nowrap",
    cell: (row) => (
      <span className="flex flex-col gap-1">
        <time dateTime={row.created_at} title={fullDate(row.created_at)}>
          {timeAgo(row.created_at)}
        </time>
        <StatusPill handled={row.is_handled} />
      </span>
    ),
  },
  {
    key: "email",
    header: "Customer",
    cell: (row) => (row.email ? <span className="wrap-anywhere">{row.email}</span> : <span className="text-faint">No email</span>),
  },
  {
    key: "question_count",
    header: "Questions",
    align: "right",
    hideOnMobile: true,
    cell: (row) => <span className="font-mono tabular-nums">{row.question_count}</span>,
  },
  // Spec 005 B15: plain-language channel status; the raw error never reaches the row.
  { key: "notifications", header: "Alerts", hideOnMobile: true, cell: (row) => <ChannelStatusList notifications={row.notifications} align="start" /> },
];

interface Selected {
  id: string;
  row: HandoffRow | null;
}

export function HandoffInbox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("open");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Selected | null>(() => {
    const id = searchParams.get("handoff");
    return id ? { id, row: null } : null;
  });

  const replaceQuery = useCallback(
    (id: string | null) => {
      // Read the live URL so this callback stays stable and SidePanel keeps its focus.
      const params = new URLSearchParams(window.location.search);
      if (id) params.set("handoff", id);
      else params.delete("handoff");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const openRow = useCallback(
    (row: HandoffRow) => {
      setSelected({ id: row.id, row });
      replaceQuery(row.id);
    },
    [replaceQuery],
  );

  const close = useCallback(() => {
    setSelected(null);
    replaceQuery(null);
  }, [replaceQuery]);

  // Spec 005 B16: the server layout renders the sidebar open count, so refresh it too.
  const changed = useCallback(() => {
    setRefreshKey((key) => key + 1);
    router.refresh();
  }, [router]);

  const toolbar = (
    <div role="tablist" aria-label="Filter handoffs" className="flex w-fit gap-1 rounded-full border border-line bg-bg p-1 text-sm">
      {tabs.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={tab === item.value}
          onClick={() => setTab(item.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 transition-colors",
            tab === item.value ? "bg-ink text-bg" : "text-muted hover:text-ink",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <ListPage<HandoffRow>
        endpoint="/api/admin/handoffs"
        label="Conversations handed to the team"
        columns={columns}
        rowsPath="handoffs"
        rowKey={(row) => row.id}
        params={{ status: tab }}
        refreshKey={refreshKey}
        toolbar={toolbar}
        emptyMessage={emptyMessages[tab]}
        unauthorizedRedirect="/admin/login"
        onRowOpen={openRow}
        openLabel={(row) => `Open conversation with ${row.email ?? "customer without email"}`}
        selectedKey={selected?.id ?? null}
      />
      {selected && (
        <HandoffDetail key={selected.id} id={selected.id} row={selected.row} onClose={close} onChanged={changed} />
      )}
    </>
  );
}
