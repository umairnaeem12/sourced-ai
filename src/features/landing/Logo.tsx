import Link from "next/link";
import { SparkleIcon } from "./icons";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink">
      <span className="relative flex size-8 items-center justify-center rounded-[10px] bg-accent text-accent-ink shadow-[0_6px_20px_-6px_var(--glow)]">
        <SparkleIcon className="size-4.5" />
      </span>
      Sourced<span className="-ml-1 font-display text-lg font-normal text-accent italic">AI</span>
    </Link>
  );
}
