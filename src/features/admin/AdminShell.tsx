"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { demoStore } from "@/features/landing/content";
import { Logo } from "@/features/landing/Logo";
import {
  ChatsIcon,
  CloseIcon,
  DocumentsIcon,
  ExternalIcon,
  GapIcon,
  InboxIcon,
  MenuIcon,
  OverviewIcon,
  SettingsIcon,
  SignOutIcon,
} from "./AdminIcons";
import { signOut } from "./adminApi";

const links = [
  { href: "/admin/overview", label: "Overview", icon: OverviewIcon },
  { href: "/admin/conversations", label: "Conversations", icon: ChatsIcon },
  { href: "/admin/handoffs", label: "Inbox", icon: InboxIcon },
  { href: "/admin/gaps", label: "Gap report", icon: GapIcon },
  { href: "/admin/documents", label: "Documents", icon: DocumentsIcon },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

interface AdminShellProps {
  openHandoffs: number;
  hasSampleData: boolean;
  // Spec 005 amendment B32: anyone can use the dashboard, so there is no session to sign out of.
  isPublic: boolean;
  children: React.ReactNode;
}

function NavLinks({ openHandoffs, onNavigate }: { openHandoffs: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {links.map(({ href, label, icon: Icon }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent",
              current ? "bg-surface-2 font-medium text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink",
            )}
          >
            <Icon className={cn("size-[18px]", current ? "text-accent" : "text-faint")} />
            <span className="flex-1">{label}</span>
            {href === "/admin/handoffs" && openHandoffs > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold text-accent-ink tabular-nums">
                {openHandoffs}
                <span className="sr-only"> open</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ isPublic }: { isPublic: boolean }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-line bg-bg/60 p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface font-display text-lg italic">
            {demoStore.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{demoStore.name}</p>
            <p className="text-[11px] text-faint">Demo store</p>
          </div>
        </div>
        <Link
          href="/demo"
          target="_blank"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Open live demo
          <ExternalIcon className="size-3.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </Link>
      </div>
      {!isPublic && (
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.replace("/admin/login");
            router.refresh();
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2/60 hover:text-ink"
        >
          <SignOutIcon className="size-[18px] text-faint" />
          Sign out
        </button>
      )}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <Logo />
      <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">Admin</span>
    </div>
  );
}

function MobileDrawer({ openHandoffs, isPublic, onClose }: { openHandoffs: number; isPublic: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col gap-6 overflow-y-auto border-r border-line bg-surface p-4"
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        <NavLinks openHandoffs={openHandoffs} onNavigate={onClose} />
        <div className="mt-auto">
          <SidebarFooter isPublic={isPublic} />
        </div>
      </div>
    </div>
  );
}

// Spec 005 B1 to B4: the admin frame around every dashboard page.
export function AdminShell({ openHandoffs, hasSampleData, isPublic, children }: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface/70 p-4 backdrop-blur lg:flex">
        <div className="px-1 pt-1">
          <Brand />
        </div>
        <NavLinks openHandoffs={openHandoffs} />
        <div className="mt-auto">
          <SidebarFooter isPublic={isPublic} />
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="relative inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink"
        >
          <MenuIcon className="size-5" />
          {openHandoffs > 0 && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent" />}
        </button>
      </header>
      {menuOpen && <MobileDrawer openHandoffs={openHandoffs} isPublic={isPublic} onClose={() => setMenuOpen(false)} />}

      <div className="min-w-0">
        {(hasSampleData || isPublic) && (
          <p className="border-b border-line bg-cite-soft/60 px-4 py-2 text-center text-xs text-cite sm:px-8">
            {[
              isPublic && "Public demo: anyone with the link can view and change this dashboard.",
              hasSampleData && "Showing sample activity for the demo store.",
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        )}
        <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
