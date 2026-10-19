import { Button } from "@/components/ui/Button";
import { ArrowRightIcon } from "./icons";
import { Reveal } from "./motion";
import { Accent } from "./SectionHeading";

export function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="px-4 pb-24 sm:px-6 lg:pb-32">
      <Reveal className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-line bg-surface px-6 py-16 text-center shadow-card sm:px-12 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_100%,black,transparent)]" />
          <div className="absolute -bottom-40 left-1/2 h-80 w-[640px] -translate-x-1/2 rounded-full bg-glow blur-[100px]" />
        </div>
        <h2
          id="closing-title"
          className="mx-auto max-w-3xl text-[2.1rem] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl"
        >
          Give your customers answers they can <Accent>check.</Accent>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-muted">
          Cited answers, an honest &ldquo;I don&rsquo;t know&rdquo;, and a person when it counts.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button href="/demo" size="lg">
            Try the live demo
            <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button href="#how-it-works" variant="secondary" size="lg">
            How it works
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
