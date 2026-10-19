import type { Metadata } from "next";
import Link from "next/link";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { demoStore } from "@/features/landing/content";
import { CheckIcon, DocIcon } from "@/features/landing/icons";
import { Logo } from "@/features/landing/Logo";
import { MotionProvider } from "@/features/landing/motion";
import { isAdminPublic } from "@/server/auth/admin-access";
import { logger } from "@/server/logger";
import { documentService } from "@/server/services/document-service";

// Spec 005 B25: docs come from the database, refreshed at most once a minute.
export const revalidate = 60;

async function loadedDocs(): Promise<string[]> {
  try {
    return await documentService.titles();
  } catch (error) {
    logger.warn("Demo page fell back to the static doc list", {
      error: error instanceof Error ? error.message : String(error),
    });
    return demoStore.docs;
  }
}

export const metadata: Metadata = {
  title: "Pinebrook Supply demo | Sourced AI",
  description: "Ask the fictional Pinebrook Supply store a question and get an answer from its help docs, with sources.",
};

const behaviours = [
  "Answers only from the docs on the left",
  "Every answer lists its sources; open one to read the passage",
  "Says so when the docs don’t cover a question",
];

export default async function DemoPage() {
  const docs = await loadedDocs();
  return (
    <MotionProvider>
      <div className="relative isolate min-h-dvh overflow-x-clip">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,black,transparent)]" />
          <div className="absolute -top-48 left-1/2 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-glow blur-[120px]" />
        </div>

        <header className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Demo" className="flex items-center gap-1 sm:gap-2">
            <Link href="/" className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-ink">
              Back to overview
            </Link>
            {/* Spec 005 amendment B32: visitors can open the owner's side of the demo too. */}
            {isAdminPublic() && (
              <Link
                href="/admin"
                className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
              >
                Admin dashboard
              </Link>
            )}
          </nav>
        </header>

        <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[300px_1fr]">
          <aside className="hidden flex-col gap-4 lg:flex">
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <p className="text-xs font-medium tracking-[0.14em] text-accent uppercase">Demo store</p>
              <p className="mt-2 font-semibold">{demoStore.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{demoStore.description}</p>
            </div>
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <h2 className="text-sm font-medium text-muted">Loaded docs</h2>
              <ul className="mt-3 grid gap-2">
                {docs.map((doc) => (
                  <li key={doc} className="flex items-center gap-2.5 text-sm">
                    <DocIcon className="text-cite" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <h2 className="text-sm font-medium text-muted">How it behaves</h2>
              <ul className="mt-3 grid gap-2.5">
                {behaviours.map((behaviour) => (
                  <li key={behaviour} className="flex gap-2.5 text-sm leading-snug">
                    <CheckIcon className="mt-0.5 text-accent" />
                    {behaviour}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <ChatPanel docCount={docs.length} />
        </main>
      </div>
    </MotionProvider>
  );
}
