import { cn } from "@/lib/cn";
import { ArrowDownIcon, ArrowUpIcon } from "../AdminIcons";

export interface StatDelta {
  // Signed change, already formatted ("+12%", "-3 min").
  text: string;
  direction: "up" | "down" | "flat";
  // Whether this direction is good news for this number.
  isGood: boolean | null;
}

interface StatTileProps {
  label: string;
  value: string | null;
  delta: StatDelta | null;
  comparison: string;
}

export function StatTile({ label, value, delta, comparison }: StatTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-2xl font-semibold tracking-tight">
        {value ?? <span className="block h-7 w-16 animate-pulse rounded-lg bg-surface-2" />}
      </dd>
      <dd className="flex min-h-4 items-center gap-1 text-xs text-faint">
        {delta && delta.direction !== "flat" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              delta.isGood === null ? "text-muted" : delta.isGood ? "text-accent" : "text-cite",
            )}
          >
            {delta.direction === "up" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
            {delta.text}
          </span>
        )}
        {delta && delta.direction === "flat" && <span className="font-medium text-muted">{delta.text}</span>}
        {delta && <span>{comparison}</span>}
      </dd>
    </div>
  );
}
