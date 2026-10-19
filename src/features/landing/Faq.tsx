"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { faqs } from "./content";
import { PlusIcon } from "./icons";
import { easeOut, Reveal } from "./motion";
import { Accent, SectionHeading } from "./SectionHeading";

interface FaqItemProps {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}

function FaqItem({ question, answer, open, onToggle }: FaqItemProps) {
  const panelId = useId();

  return (
    <div className="border-b border-line last:border-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-6 py-5 text-left text-base font-medium transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {question}
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border border-line transition-all duration-300",
              open && "rotate-45 border-accent bg-accent text-accent-ink",
            )}
          >
            <PlusIcon className="size-3.5" />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-label={question}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: easeOut }}
            className="overflow-hidden"
          >
            <p className="max-w-xl pb-5 leading-relaxed text-muted">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Faq() {
  // One answer open at a time; opening another closes the current one.
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-32">
        <SectionHeading
          id="faq-title"
          eyebrow="FAQ"
          title={
            <>
              Questions, <Accent>answered</Accent>
            </>
          }
          intro="The short version of how Sourced AI behaves."
        />
        <Reveal className="rounded-3xl border border-line bg-surface px-6 shadow-card">
          {faqs.map((faq, i) => (
            <FaqItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              open={openIndex === i}
              onToggle={() => setOpenIndex((current) => (current === i ? null : i))}
            />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
