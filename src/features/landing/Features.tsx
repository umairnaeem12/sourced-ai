"use client";

import { motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { features, gapReport, providers } from "./content";
import { DocIcon, SearchIcon, SparkleIcon, UserIcon } from "./icons";
import { easeOut } from "./motion";
import { Accent, SectionHeading } from "./SectionHeading";

const inView = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, amount: 0.5 },
} as const;

const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

function SourcesVisual() {
  return (
    <motion.div
      {...inView}
      variants={{ show: { transition: { staggerChildren: 0.25 } } }}
      className="grid h-full items-center gap-3 sm:grid-cols-[1fr_1.1fr]"
    >
      <motion.p
        variants={rise}
        className="rounded-2xl rounded-bl-sm border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink"
      >
        Orders ship within 2 business days, and Canada delivery takes 5 to 8 days
        <span className="ml-1 rounded bg-cite-soft px-1 py-px align-super font-mono text-[10px] font-semibold text-cite ring-2 ring-cite/30">
          1
        </span>
      </motion.p>
      <motion.div
        variants={rise}
        className="rounded-2xl border border-cite/30 bg-surface p-3.5 text-xs leading-relaxed text-muted shadow-card"
      >
        <div className="mb-1.5 flex items-center gap-1.5 font-medium text-ink">
          <DocIcon className="size-3.5 text-cite" />
          Shipping rates and delivery times, &sect;3
        </div>
        &hellip;we dispatch within two business days.{" "}
        <mark className="rounded bg-cite-soft px-0.5 text-ink">
          International orders to Canada arrive in 5&ndash;8 business days.
        </mark>
      </motion.div>
    </motion.div>
  );
}

function NoGuessVisual() {
  return (
    <motion.div
      {...inView}
      variants={{ show: { transition: { staggerChildren: 0.3 } } }}
      className="flex h-full flex-col justify-center gap-2"
    >
      <motion.div
        variants={rise}
        className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink"
      >
        <SearchIcon className="size-3.5 text-muted" />
        Do you price match?
      </motion.div>
      <motion.div variants={rise} className="px-1 text-[11px] text-cite">
        0 passages above the cutoff
      </motion.div>
      <motion.div
        variants={rise}
        className="rounded-2xl rounded-bl-sm border border-line bg-surface px-3 py-2 text-xs text-ink"
      >
        I won&rsquo;t guess on that one. Want a person?
      </motion.div>
    </motion.div>
  );
}

function HandoffVisual() {
  const reduced = useReducedMotion();
  return (
    <div className="flex h-full items-center justify-between gap-2 px-1">
      <div className="flex flex-col items-center gap-1.5">
        <span className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-muted">
          <UserIcon />
        </span>
        <span className="text-[10px] text-faint">Customer</span>
      </div>
      <div className="relative mx-1 h-px flex-1 bg-line-strong">
        {[0, 1, 2].map((i) =>
          reduced ? (
            <span
              key={i}
              className="absolute -top-0.75 size-1.5 rounded-full bg-accent"
              style={{ left: `${25 + i * 25}%` }}
            />
          ) : (
          <motion.span
            key={i}
            className="absolute -top-0.75 size-1.5 rounded-full bg-accent"
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeInOut" }}
          />
          ),
        )}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="flex -space-x-2">
          {["JM", "AK", "RS"].map((initials) => (
            <span
              key={initials}
              className="flex size-8 items-center justify-center rounded-full border-2 border-bg bg-accent-soft text-[10px] font-semibold text-accent"
            >
              {initials}
            </span>
          ))}
        </span>
        <span className="font-mono text-[10px] text-faint">#support-handoff</span>
      </div>
    </div>
  );
}

function GapVisual() {
  const max = gapReport[0].count;
  return (
    <motion.div
      {...inView}
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      className="flex h-full items-end gap-2.5 px-1"
    >
      {gapReport.map((row) => (
        <div key={row.question} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted">{row.count}</span>
          <motion.span
            variants={{
              hidden: { scaleY: 0 },
              show: { scaleY: 1, transition: { duration: 0.8, ease: easeOut } },
            }}
            className="block w-full origin-bottom rounded-t-md bg-linear-to-t from-cite/50 to-cite"
            style={{ height: `${(row.count / max) * 72}px` }}
          />
        </div>
      ))}
    </motion.div>
  );
}

function ProviderVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.6 });
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!visible || reduced) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % providers.length), 1800);
    return () => clearInterval(timer);
  }, [visible, reduced]);

  return (
    <div ref={ref} className="flex h-full flex-col justify-center gap-3">
      <div className="relative grid grid-cols-3 rounded-full border border-line bg-surface p-1 text-xs">
        {providers.map((provider, i) => (
          <span
            key={provider}
            className={cn(
              "relative z-10 py-1.5 text-center font-medium transition-colors duration-300",
              i === active ? "text-accent-ink" : "text-muted",
            )}
          >
            {i === active && (
              <motion.span
                layoutId="provider-pill"
                className="absolute inset-0 -z-10 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {provider}
          </span>
        ))}
      </div>
      <code className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[11px] text-muted">
        AI_PROVIDER=<span className="text-accent">{providers[active].toLowerCase()}</span>
      </code>
    </div>
  );
}

const visuals = [SourcesVisual, NoGuessVisual, HandoffVisual, GapVisual, ProviderVisual];
const spans = [
  "sm:col-span-2 lg:col-span-4",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "sm:col-span-2 lg:col-span-2",
];

interface SpotlightCardProps {
  className?: string;
  index: number;
  children: React.ReactNode;
}

function SpotlightCard({ className, index, children }: SpotlightCardProps) {
  const ref = useRef<HTMLLIElement>(null);

  const onMouseMove = (event: React.MouseEvent<HTMLLIElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--y", `${event.clientY - rect.top}px`);
  };

  return (
    <motion.li
      ref={ref}
      onMouseMove={onMouseMove}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: (index % 3) * 0.1, duration: 0.7, ease: easeOut }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-card transition-colors duration-300 hover:border-line-strong",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_circle_at_var(--x)_var(--y),var(--glow),transparent_45%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative">{children}</div>
    </motion.li>
  );
}

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="relative scroll-mt-20 border-y border-line bg-surface-2/50"
    >
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title={
            <>
              Built for answers your team can <Accent>trust</Accent>
            </>
          }
          intro="Support bots lose customers when they invent a policy. Sourced AI only answers from what you gave it, and shows its work."
        />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {features.map((feature, i) => {
            const Visual = visuals[i];
            return (
              <SpotlightCard key={feature.title} index={i} className={spans[i]}>
                <div
                  aria-hidden="true"
                  className={cn(
                    "overflow-hidden rounded-2xl border border-line bg-bg p-4",
                    i === 0 ? "h-auto sm:h-44" : "h-36",
                  )}
                >
                  <Visual />
                </div>
                <div className="px-1 pt-5 pb-1">
                  <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    {i === 0 && <SparkleIcon className="text-accent" />}
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
                </div>
              </SpotlightCard>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
