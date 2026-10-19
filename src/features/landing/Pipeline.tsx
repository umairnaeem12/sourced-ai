"use client";

import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/cn";
import { demoStore, pipeline, pipelineMatches, pipelineQuestion } from "./content";
import { DocIcon, SearchIcon } from "./icons";
import { easeOut } from "./motion";
import { Accent, SectionHeading } from "./SectionHeading";

const inView = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, amount: 0.5 },
} as const;

const stagger: Variants = { show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };
const slideIn: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: easeOut } },
};
const grow: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.9, ease: easeOut } },
};

function DocsVisual() {
  return (
    <motion.div {...inView} variants={stagger} className="flex flex-col gap-1.5">
      {demoStore.docs.map((doc) => (
        <motion.div
          key={doc}
          variants={slideIn}
          className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-muted"
        >
          <DocIcon className="size-3 text-cite" />
          <span className="truncate">{doc}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

const passageLines = [
  [92, 70],
  [84, 96, 48],
  [76, 60],
];

function PassagesVisual() {
  return (
    <motion.div {...inView} variants={stagger} className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
        <DocIcon className="size-3 text-cite" />
        Returns and refunds
      </div>
      {passageLines.map((lines, i) => (
        <motion.div
          key={i}
          variants={slideIn}
          className={cn(
            "flex flex-col gap-1 rounded-lg border border-dashed px-2 py-1.5",
            i === 1 ? "border-accent bg-accent-soft/60" : "border-line-strong",
          )}
        >
          {lines.map((width, j) => (
            <motion.span
              key={j}
              variants={grow}
              className={cn(
                "block h-1.5 origin-left rounded-full",
                i === 1 ? "bg-accent/60" : "bg-line-strong",
              )}
              style={{ width: `${width}%` }}
            />
          ))}
        </motion.div>
      ))}
    </motion.div>
  );
}

function MatchVisual() {
  return (
    <motion.div {...inView} variants={stagger} className="flex h-full flex-col gap-2.5">
      <motion.div
        variants={slideIn}
        className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-ink"
      >
        <SearchIcon className="size-3 text-accent" />
        <span className="truncate">{pipelineQuestion}</span>
      </motion.div>
      {pipelineMatches.map((match) => (
        <motion.div
          key={match.label}
          variants={slideIn}
          className={cn("flex items-center gap-2 text-[11px]", !match.used && "opacity-50")}
        >
          <span className="w-16 shrink-0 text-muted">{match.label}</span>
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <motion.span
              variants={grow}
              className={cn(
                "absolute inset-y-0 left-0 origin-left rounded-full",
                match.used ? "bg-accent" : "bg-faint",
              )}
              style={{ width: `${match.score * 100}%` }}
            />
          </span>
          <span className="w-7 text-right font-mono text-ink">{match.score.toFixed(2)}</span>
        </motion.div>
      ))}
      <p className="mt-auto text-[10px] text-faint">Scores are illustrative.</p>
    </motion.div>
  );
}

function Cite({ n }: { n: number }) {
  return (
    <sup className="mx-0.5 rounded bg-cite-soft px-1 py-px font-mono text-[9px] font-semibold text-cite">
      {n}
    </sup>
  );
}

function AnswerVisual() {
  return (
    <motion.div {...inView} variants={stagger} className="flex flex-col gap-2">
      <motion.p
        variants={slideIn}
        className="rounded-xl rounded-bl-sm border border-line bg-surface px-2.5 py-2 text-[11px] leading-relaxed text-ink"
      >
        Yes, within 30 days if it&rsquo;s undamaged
        <Cite n={1} />. Used items carry a 10% restocking fee
        <Cite n={2} />.
      </motion.p>
      {["Returns and refunds §1", "Returns and refunds §2"].map((source, i) => (
        <motion.div
          key={source}
          variants={slideIn}
          className="flex items-center gap-1.5 text-[11px] text-muted"
        >
          <span className="flex size-4 items-center justify-center rounded bg-cite-soft font-mono text-[9px] font-semibold text-cite">
            {i + 1}
          </span>
          {source}
        </motion.div>
      ))}
    </motion.div>
  );
}

const visuals = [DocsVisual, PassagesVisual, MatchVisual, AnswerVisual];

export function Pipeline() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <SectionHeading
          id="how-it-works-title"
          eyebrow="Under the hood"
          title={
            <>
              From your docs to a <Accent>cited answer</Accent> in four steps
            </>
          }
          intro="The AI only sees the passages that match the question, and it is told to answer from them and cite them."
        />

        <motion.div
          aria-hidden="true"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="relative mt-16 hidden h-8 lg:grid lg:grid-cols-4"
        >
          <span className="absolute top-1/2 right-[12.5%] left-[12.5%] h-px bg-line" />
          <motion.span
            variants={{
              hidden: { scaleX: 0 },
              show: { scaleX: 1, transition: { duration: 1.6, ease: easeOut } },
            }}
            className="absolute top-1/2 right-[12.5%] left-[12.5%] h-px origin-left bg-linear-to-r from-accent via-accent to-cite"
          />
          {pipeline.map((step, i) => (
            <motion.span
              key={step.title}
              variants={{
                hidden: { scale: 0.6, opacity: 0 },
                show: {
                  scale: 1,
                  opacity: 1,
                  transition: { delay: 0.15 + i * 0.4, duration: 0.4, ease: easeOut },
                },
              }}
              className="relative z-10 mx-auto flex size-8 items-center justify-center rounded-full border border-accent bg-bg font-mono text-xs font-semibold text-accent shadow-[0_0_0_6px_var(--bg)]"
            >
              {i + 1}
            </motion.span>
          ))}
        </motion.div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-6 lg:grid-cols-4">
          {pipeline.map((step, i) => {
            const Visual = visuals[i];
            return (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.12, duration: 0.7, ease: easeOut }}
                className="flex flex-col rounded-3xl border border-line bg-surface p-4 shadow-card"
              >
                <div
                  aria-hidden="true"
                  className="h-44 overflow-hidden rounded-2xl border border-line bg-bg p-3"
                >
                  <Visual />
                </div>
                <div className="px-1 pt-5 pb-1">
                  <p className="font-mono text-xs text-faint lg:hidden">Step {i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight lg:mt-0">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
