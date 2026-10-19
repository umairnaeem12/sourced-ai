"use client";

import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { gapReport, handoffMock } from "./content";
import { SparkleIcon } from "./icons";
import { easeOut, Reveal } from "./motion";
import { Accent, SectionHeading } from "./SectionHeading";

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    if (!visible) return;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: easeOut,
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [visible, reduced, value]);

  return <span ref={ref}>{shown}</span>;
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center justify-between text-xs text-faint">
      {children}
      <span className="rounded-full border border-line px-2 py-0.5">Sample data</span>
    </p>
  );
}

function HandoffPanel() {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <PanelLabel>Handoff, as it arrives in Slack</PanelLabel>
      <div className="flex-1 overflow-hidden rounded-2xl border border-line bg-bg">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-sm font-semibold">
          <span className="text-faint">#</span>
          {handoffMock.channel}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="flex gap-3 p-4"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <SparkleIcon />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold">Sourced AI</span>
              <span className="rounded bg-surface-2 px-1 text-[10px] font-medium text-muted">APP</span>
              <span className="text-xs text-faint">{handoffMock.time}</span>
            </p>
            <p className="mt-1 font-medium">{handoffMock.headline}</p>
            <div className="mt-3 space-y-2 border-l-2 border-accent/60 pl-3 text-[13px]">
              {handoffMock.transcript.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.25, duration: 0.5, ease: easeOut }}
                  className="text-muted"
                >
                  <span className="font-medium text-ink">{line.from}:</span> {line.text}
                </motion.p>
              ))}
            </div>
            <p className="mt-3 inline-flex rounded-md bg-cite-soft px-2 py-1 text-xs font-medium text-cite">
              {handoffMock.matched}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function GapPanel() {
  const max = gapReport[0].count;
  return (
    <div className="flex h-full flex-col rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <PanelLabel>Gap report, last 7 days</PanelLabel>
      <div className="flex-1 overflow-hidden rounded-2xl border border-line bg-bg">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Questions Sourced AI could not answer, with how often each was asked</caption>
          <thead>
            <tr className="border-b border-line text-xs text-faint">
              <th scope="col" className="px-4 py-2.5 font-medium">
                Unanswered question
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Asked
              </th>
            </tr>
          </thead>
          <tbody>
            {gapReport.map((row, i) => (
              <motion.tr
                key={row.question}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5, ease: easeOut }}
                className="border-b border-line last:border-0"
              >
                <td className="px-4 py-3">
                  <span className="block">{row.question}</span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-line">
                    <motion.span
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.12, duration: 1, ease: easeOut }}
                      className="block h-full origin-left rounded-full bg-cite"
                      style={{ width: `${(row.count / max) * 100}%` }}
                    />
                  </span>
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-ink tabular-nums">
                  <CountUp value={row.count} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TeamView() {
  return (
    <section id="team" aria-labelledby="team-title" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <SectionHeading
          id="team-title"
          eyebrow="For your team"
          title={
            <>
              What your team <Accent>sees</Accent>
            </>
          }
          intro="When a customer wants a person, your team gets the whole conversation in Slack, by email or through a webhook, and it waits in the admin inbox. Every question it couldn't answer lands in the gap report."
        />
        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <Reveal>
            <HandoffPanel />
          </Reveal>
          <Reveal delay={0.12}>
            <GapPanel />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
