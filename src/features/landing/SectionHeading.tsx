import { cn } from "@/lib/cn";
import { Reveal } from "./motion";

interface SectionHeadingProps {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  intro?: string;
  align?: "left" | "center";
}

export function SectionHeading({ id, eyebrow, title, intro, align = "left" }: SectionHeadingProps) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p
        className={cn(
          "inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-accent uppercase",
        )}
      >
        <span aria-hidden="true" className="h-px w-6 bg-accent" />
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-4 text-[2.1rem] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl"
      >
        {title}
      </h2>
      {intro && <p className="mt-4 text-lg leading-relaxed text-pretty text-muted">{intro}</p>}
    </Reveal>
  );
}

export function Accent({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-display font-normal tracking-[-0.01em] text-accent italic">{children}</span>
  );
}
