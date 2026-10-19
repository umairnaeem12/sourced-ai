interface SparklineProps {
  values: number[];
  label: string;
}

const WIDTH = 84;
const HEIGHT = 24;

// De-emphasised trend line; the latest point is the accent dot.
export function Sparkline({ values, label }: SparklineProps) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (WIDTH - 6) / (values.length - 1) : 0;
  const points = values.map((value, i) => [3 + i * step, HEIGHT - 3 - (value / max) * (HEIGHT - 6)] as const);
  const last = points[points.length - 1];
  return (
    <svg width={WIDTH} height={HEIGHT} role="img" aria-label={label} className="block overflow-visible">
      <line x1={3} x2={WIDTH - 3} y1={HEIGHT - 3} y2={HEIGHT - 3} stroke="var(--chart-grid)" strokeWidth={1} />
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="var(--faint)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last && <circle cx={last[0]} cy={last[1]} r={3.5} fill="var(--series-2)" stroke="var(--surface)" strokeWidth={2} />}
    </svg>
  );
}
