"use client";

import { motion } from "motion/react";
import { comparison } from "./content";
import { CheckIcon, CrossIcon } from "./icons";
import { easeOut, Reveal } from "./motion";
import { Accent, SectionHeading } from "./SectionHeading";

const rowMotion = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.6 },
  transition: { delay: i * 0.08, duration: 0.5, ease: easeOut },
});

export function Comparison() {
  return (
    <section
      id="compare"
      aria-labelledby="compare-title"
      className="scroll-mt-20 border-y border-line bg-surface-2/50"
    >
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <SectionHeading
          id="compare-title"
          eyebrow="Compare"
          align="center"
          title={
            <>
              How it compares to a <Accent>generic chatbot</Accent>
            </>
          }
        />

        <Reveal className="mt-14 hidden overflow-hidden rounded-3xl border border-line bg-surface shadow-card md:block">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Generic AI chatbot compared with Sourced AI</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-1/4 px-6 py-4 font-medium text-faint">
                  Capability
                </th>
                <th scope="col" className="px-6 py-4 font-medium text-muted">
                  Generic AI chatbot
                </th>
                <th scope="col" className="bg-accent-soft/50 px-6 py-4 font-semibold text-accent">
                  Sourced AI
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <motion.tr key={row.capability} {...rowMotion(i)} className="border-b border-line last:border-0">
                  <th scope="row" className="px-6 py-5 font-medium">
                    {row.capability}
                  </th>
                  <td className="px-6 py-5 text-muted">
                    <span className="flex gap-2.5">
                      <CrossIcon className="mt-0.5 text-faint" />
                      {row.generic}
                    </span>
                  </td>
                  <td className="bg-accent-soft/50 px-6 py-5 text-ink">
                    <span className="flex gap-2.5">
                      <CheckIcon className="mt-0.5 text-accent" />
                      {row.sourced}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Reveal>

        {/* Phones get stacked cards; the table is too wide for three columns. */}
        <div className="mt-10 flex flex-col gap-3 md:hidden">
          {comparison.map((row, i) => (
            <motion.div
              key={row.capability}
              {...rowMotion(i)}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <p className="font-medium">{row.capability}</p>
              <p className="mt-3 flex gap-2.5 text-sm text-muted">
                <CrossIcon className="mt-0.5 text-faint" />
                {row.generic}
              </p>
              <p className="mt-2 flex gap-2.5 rounded-xl bg-accent-soft/60 p-2.5 text-sm text-ink">
                <CheckIcon className="mt-0.5 text-accent" />
                {row.sourced}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
