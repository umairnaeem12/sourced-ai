interface BarListItem {
  key: string;
  label: string;
  value: number;
}

interface BarListProps {
  items: BarListItem[];
  label: string;
  valueLabel: (value: number) => string;
  emptyMessage: string;
}

// One series, one color: bar length carries the value and the number sits at the tip.
export function BarList({ items, label, valueLabel, emptyMessage }: BarListProps) {
  if (items.length === 0) return <p className="py-8 text-center text-sm text-muted">{emptyMessage}</p>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ol aria-label={label} className="flex flex-col gap-3.5">
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 text-xs text-muted tabular-nums">{valueLabel(item.value)}</span>
          </div>
          <div aria-hidden="true" className="h-2.5 w-full">
            <div className="h-full rounded-r-[4px] bg-series-1" style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
