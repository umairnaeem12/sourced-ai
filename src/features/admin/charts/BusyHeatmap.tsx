"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface BusyCell {
  weekday: number;
  hour: number;
  questions: number;
}

interface BusyHeatmapProps {
  cells: BusyCell[];
  timeZone: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Sequential, one hue: share of the high step mixed into the surface, light to dark.
const STEPS = [18, 38, 58, 78, 100];

function hourLabel(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

function hourRange(hour: number): string {
  const pad = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
  return `${pad(hour)} to ${pad(hour + 1)}`;
}

export function BusyHeatmap({ cells, timeZone }: BusyHeatmapProps) {
  const [active, setActive] = useState<{ weekday: number; hour: number } | null>(null);
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const cell of cells) grid[cell.weekday - 1][cell.hour] = cell.questions;
  const max = Math.max(0, ...cells.map((cell) => cell.questions));

  if (max === 0) return <p className="py-8 text-center text-sm text-muted">No questions in this period</p>;

  const step = (value: number) => (value === 0 ? null : STEPS[Math.min(STEPS.length - 1, Math.ceil((value / max) * STEPS.length) - 1)]);
  let busiest = { weekday: 0, hour: 0, questions: 0 };
  grid.forEach((row, d) => row.forEach((value, h) => value > busiest.questions && (busiest = { weekday: d, hour: h, questions: value })));
  const readout = active ? grid[active.weekday][active.hour] : null;

  return (
    <figure className="flex flex-col gap-3">
      <div
        role="grid"
        aria-label={`Questions by weekday and hour, ${timeZone} time. Busiest: ${WEEKDAY_NAMES[busiest.weekday]} ${hourRange(busiest.hour)}, ${busiest.questions} questions.`}
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: "2.25rem repeat(24, minmax(0, 1fr))" }}
        onPointerLeave={() => setActive(null)}
      >
        {grid.map((row, d) => (
          <div key={WEEKDAYS[d]} role="row" className="contents">
            <span role="rowheader" className="pr-1 text-[11px] leading-none text-faint self-center">
              {WEEKDAYS[d]}
            </span>
            {row.map((value, h) => {
              const level = step(value);
              const isActive = active?.weekday === d && active.hour === h;
              return (
                <span
                  key={h}
                  role="gridcell"
                  tabIndex={d === 0 && h === 0 ? 0 : -1}
                  aria-label={`${WEEKDAY_NAMES[d]} ${hourRange(h)}: ${value} ${value === 1 ? "question" : "questions"}`}
                  onPointerEnter={() => setActive({ weekday: d, hour: h })}
                  onFocus={() => setActive({ weekday: d, hour: h })}
                  onKeyDown={(event) => {
                    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
                    const move = moves[event.key];
                    if (!move) return;
                    event.preventDefault();
                    const nd = Math.min(6, Math.max(0, d + move[0]));
                    const nh = Math.min(23, Math.max(0, h + move[1]));
                    const grid = event.currentTarget.parentElement?.parentElement;
                    grid?.querySelectorAll<HTMLElement>('[role="gridcell"]')[nd * 24 + nh]?.focus();
                  }}
                  className={cn(
                    "aspect-square rounded-[3px] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-accent",
                    isActive && "ring-2 ring-ink/60",
                  )}
                  style={{
                    background: level === null ? "var(--surface-2)" : `color-mix(in oklab, var(--heat-high) ${level}%, var(--surface))`,
                  }}
                />
              );
            })}
          </div>
        ))}
        <span aria-hidden="true" />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} aria-hidden="true" className="pt-1 text-center text-[10px] leading-none text-faint">
            {h % 6 === 0 ? hourLabel(h) : ""}
          </span>
        ))}
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span aria-live="polite" className="min-h-4">
          {active && readout !== null
            ? `${WEEKDAY_NAMES[active.weekday]} ${hourRange(active.hour)}: ${readout} ${readout === 1 ? "question" : "questions"}`
            : `Busiest: ${WEEKDAYS[busiest.weekday]} ${hourRange(busiest.hour)}`}
        </span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          Fewer
          {STEPS.map((level) => (
            <span key={level} className="size-2.5 rounded-[3px]" style={{ background: `color-mix(in oklab, var(--heat-high) ${level}%, var(--surface))` }} />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}
