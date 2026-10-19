import { Button } from "@/components/ui/Button";
import { demoStore } from "./content";
import { ArrowRightIcon, DocIcon } from "./icons";
import { Reveal } from "./motion";
import { Accent, SectionHeading } from "./SectionHeading";

// Spec 001 amendment 2: links to the live chat now that spec 002 has passed its live check.
export function DemoStore() {
  return (
    <section id="demo" aria-labelledby="demo-title" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="demo-title"
            eyebrow="Demo"
            title={
              <>
                Try it on <Accent>{demoStore.name}</Accent>
              </>
            }
            intro={demoStore.description}
          />
          <Reveal className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-muted shadow-card">
              <span aria-hidden="true" className="size-2 animate-pulse-dot rounded-full bg-accent" />
              Live chat is open
            </p>
            <Button href="/demo" size="lg">
              Try the live demo
              <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Reveal className="rounded-3xl border border-line bg-surface p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-ink font-display text-2xl text-bg italic">
                P
              </span>
              <div>
                <p className="font-semibold">{demoStore.name}</p>
                <p className="text-sm text-faint">Home and kitchen goods, fictional</p>
              </div>
            </div>
            <h3 className="mt-7 text-sm font-medium text-muted">Loaded with these docs</h3>
            <ul className="mt-3 grid gap-2">
              {demoStore.docs.map((doc) => (
                <li
                  key={doc}
                  className="flex items-center gap-3 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm"
                >
                  <DocIcon className="text-cite" />
                  {doc}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1} className="rounded-3xl border border-line bg-surface p-6 shadow-card">
            <h3 className="text-sm font-medium text-muted">Questions to try</h3>
            <ul className="mt-3 grid gap-3">
              {demoStore.questions.map((question, i) => (
                <li
                  key={question}
                  className="flex items-start gap-3 rounded-2xl rounded-br-md bg-accent-soft/70 px-4 py-3.5"
                >
                  <span className="font-mono text-xs text-accent">0{i + 1}</span>
                  <span className="text-ink">{question}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
              {demoStore.gapNote}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
