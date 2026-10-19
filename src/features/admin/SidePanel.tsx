"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "./AdminIcons";

interface SidePanelProps {
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Spec 005 B13: a right-hand panel, full width on phones. Escape or the backdrop closes it.
export function SidePanel({ title, subtitle, onClose, children, footer }: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
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
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close panel" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-surface shadow-card outline-none sm:w-[min(560px,92vw)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      <span className="h-3 w-2/3 animate-pulse rounded-full bg-surface-2" />
      <span className="h-3 w-1/2 animate-pulse rounded-full bg-surface-2" />
      <span className="h-16 w-full animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
