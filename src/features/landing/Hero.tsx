import { Button } from "@/components/ui/Button";
import { ChatReplay } from "./ChatReplay";
import { heroPoints } from "./content";
import { ArrowRightIcon, CheckIcon } from "./icons";
import { Reveal } from "./motion";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-28 pb-24 sm:pt-36 lg:pb-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -top-48 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-glow blur-[120px]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div>
          <Reveal>
            <a
              href="#how-it-works"
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 py-1 pr-3 pl-1 text-xs text-muted backdrop-blur transition-colors hover:border-line-strong"
            >
              <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
                AI support agent
              </span>
              Answers only from your docs
              <ArrowRightIcon className="size-3" />
            </a>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="text-[2.6rem] leading-[1.04] font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-[4.4rem]">
              <span className="text-gradient">Sourced AI answers your customers</span>{" "}
              <span className="font-display font-normal tracking-[-0.01em] text-accent italic">
                from your own docs.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted">
              It links the passage behind every answer, says when it doesn&rsquo;t know, and
              passes the chat to a person when a customer asks.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button href="/demo" size="lg">
                Try the live demo
                <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button href="#how-it-works" variant="secondary" size="lg">
                How it works
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {heroPoints.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <CheckIcon className="size-3" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <Reveal delay={0.2}>
          <ChatReplay />
        </Reveal>
      </div>
    </section>
  );
}
