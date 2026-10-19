"use client";

import { useState } from "react";
import { shortDate } from "../format";
import { ChartTooltip } from "./ChartTooltip";
import { useElementWidth } from "./useElementWidth";

export interface DailyCount {
  date: string;
  answered: number;
  unanswered: number;
}

interface DailyQuestionsChartProps {
  days: DailyCount[];
}

const HEIGHT = 220;
const AXIS_LEFT = 32;
const AXIS_BOTTOM = 26;
const TOP = 8;
const MAX_BAR = 24;
const GAP = 2;
const RADIUS = 4;

const SERIES = [
  { key: "answered" as const, label: "Answered from the docs", color: "var(--series-1)" },
  { key: "unanswered" as const, label: "Not answered", color: "var(--series-2)" },
];

// A clean axis top that splits evenly in half (the middle gridline).
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const top = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * magnitude).find((candidate) => candidate >= value) ?? value;
  return Math.ceil(top / 2) * 2;
}

// A column segment with a rounded data-end and a square base.
function roundedTop(x: number, y: number, width: number, height: number): string {
  const r = Math.min(RADIUS, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

export function DailyQuestionsChart({ days }: DailyQuestionsChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const total = days.reduce((sum, day) => sum + day.answered + day.unanswered, 0);
  const max = niceMax(Math.max(1, ...days.map((day) => day.answered + day.unanswered)));
  const plotWidth = width - AXIS_LEFT;
  const plotHeight = HEIGHT - AXIS_BOTTOM - TOP;
  const band = plotWidth / Math.max(1, days.length);
  const barWidth = Math.max(2, Math.min(MAX_BAR, band - GAP));
  const scale = (value: number) => (value / max) * plotHeight;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(plotWidth / 70))));
  const activeDay = active === null ? null : days[active];

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: series.color }} />
            {series.label}
          </span>
        ))}
      </figcaption>

      <div ref={ref} className="relative" onPointerLeave={() => setActive(null)}>
        {total === 0 ? (
          <p className="flex items-center justify-center text-sm text-muted" style={{ height: HEIGHT }}>
            No questions in this period
          </p>
        ) : (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Questions per day, ${total} in total. Use the left and right arrow keys to read each day.`}
            tabIndex={0}
            className="block overflow-visible outline-none focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            onFocus={() => {
              if (active === null) {
                setActive(days.length - 1);
                setPointer({ x: AXIS_LEFT + band * (days.length - 0.5), y: TOP });
              }
            }}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const next = Math.min(days.length - 1, Math.max(0, (active ?? days.length - 1) + (event.key === "ArrowLeft" ? -1 : 1)));
              setActive(next);
              setPointer({ x: AXIS_LEFT + band * (next + 0.5), y: TOP });
            }}
          >
            {ticks.map((tick) => {
              const y = TOP + plotHeight - scale(tick);
              return (
                <g key={tick}>
                  <line x1={AXIS_LEFT} x2={width} y1={y} y2={y} stroke={tick === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} strokeWidth={1} />
                  <text x={AXIS_LEFT - 8} y={y} dy="0.32em" textAnchor="end" className="fill-faint text-[11px] tabular-nums">
                    {Math.round(tick)}
                  </text>
                </g>
              );
            })}

            {days.map((day, i) => {
              const x = AXIS_LEFT + band * i + (band - barWidth) / 2;
              const answeredHeight = scale(day.answered);
              const unansweredHeight = scale(day.unanswered);
              const base = TOP + plotHeight;
              const hasTop = day.unanswered > 0;
              const dimmed = active !== null && active !== i;
              return (
                <g key={day.date} opacity={dimmed ? 0.55 : 1}>
                  {day.answered > 0 &&
                    (hasTop ? (
                      <rect x={x} y={base - answeredHeight} width={barWidth} height={answeredHeight} fill="var(--series-1)" />
                    ) : (
                      <path d={roundedTop(x, base - answeredHeight, barWidth, answeredHeight)} fill="var(--series-1)" />
                    ))}
                  {hasTop && (
                    <path
                      d={roundedTop(
                        x,
                        base - answeredHeight - unansweredHeight - (day.answered > 0 ? GAP : 0),
                        barWidth,
                        unansweredHeight,
                      )}
                      fill="var(--series-2)"
                    />
                  )}
                  {i % labelEvery === (days.length - 1) % labelEvery && (
                    <text x={x + barWidth / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-faint text-[11px]">
                      {shortDate(day.date)}
                    </text>
                  )}
                  <rect
                    x={AXIS_LEFT + band * i}
                    y={TOP}
                    width={band}
                    height={plotHeight}
                    fill="transparent"
                    onPointerMove={(event) => {
                      const box = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setActive(i);
                      setPointer({ x: event.clientX - box.left, y: event.clientY - box.top });
                    }}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {activeDay && pointer && (
          <ChartTooltip
            title={shortDate(activeDay.date)}
            x={pointer.x}
            y={pointer.y}
            containerWidth={width}
            rows={[
              { label: "questions", value: String(activeDay.answered + activeDay.unanswered) },
              ...SERIES.map((series) => ({ label: series.label.toLowerCase(), value: String(activeDay[series.key]), color: series.color })),
            ]}
          />
        )}
      </div>

      <table className="sr-only">
        <caption>Questions per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Answered from the docs</th>
            <th scope="col">Not answered</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{shortDate(day.date)}</th>
              <td>{day.answered}</td>
              <td>{day.unanswered}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
