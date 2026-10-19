interface TooltipRow {
  label: string;
  value: string;
  // A short colored line keys the row to its series.
  color?: string;
}

interface ChartTooltipProps {
  title: string;
  rows: TooltipRow[];
  x: number;
  y: number;
  containerWidth: number;
}

const TOOLTIP_WIDTH = 176;

export function ChartTooltip({ title, rows, x, y, containerWidth }: ChartTooltipProps) {
  // Flip to the left of the pointer near the right edge so it never leaves the card.
  const left = x + 12 + TOOLTIP_WIDTH > containerWidth ? Math.max(0, x - 12 - TOOLTIP_WIDTH) : x + 12;
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-card"
      style={{ left, top: Math.max(0, y - 8), width: TOOLTIP_WIDTH }}
    >
      <p className="mb-1.5 text-faint">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            {row.color && <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: row.color }} />}
            <span className="font-semibold text-ink tabular-nums">{row.value}</span>
            <span className="truncate text-muted">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
