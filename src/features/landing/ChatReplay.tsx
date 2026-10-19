"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { chatScript } from "./content";
import { CheckIcon, DocIcon, SearchIcon, SendIcon, SparkleIcon, UserIcon } from "./icons";
import { easeOut } from "./motion";

type DocState = "idle" | "scan" | "hit" | "miss";

type Message =
  | { id: string; kind: "customer"; text: string }
  | { id: string; kind: "search"; docs: DocState[]; found: boolean; result?: string }
  | { id: string; kind: "passage" }
  | { id: string; kind: "agent"; text: string; source?: string; handoff?: "offer" | "sent" }
  | { id: string; kind: "system"; text: string };

const { docs, first, second } = chatScript;

const finalTranscript: Message[] = [
  { id: "q1", kind: "customer", text: first.question },
  {
    id: "s1",
    kind: "search",
    docs: docs.map((doc) => (doc === first.hit ? "hit" : "miss")),
    found: true,
    result: "2 passages matched",
  },
  { id: "p1", kind: "passage" },
  { id: "a1", kind: "agent", text: first.answer, source: first.source },
  { id: "q2", kind: "customer", text: second.question },
  { id: "s2", kind: "search", docs: docs.map(() => "miss"), found: false, result: "No close match" },
  { id: "a2", kind: "agent", text: second.answer, handoff: "sent" },
  { id: "h2", kind: "system", text: second.handoff },
];

function useReplay(enabled: boolean) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const { signal } = controller;

    const sleep = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(signal.reason);
          },
          { once: true },
        );
      });
    const push = (message: Message) => setMessages((prev) => [...prev, message]);
    const patch = (id: string, change: Partial<Message>) =>
      setMessages((prev) =>
        prev.map((message) => (message.id === id ? ({ ...message, ...change } as Message) : message)),
      );

    const type = async (text: string) => {
      for (let i = 1; i <= text.length; i++) {
        setDraft(text.slice(0, i));
        await sleep(30 + Math.random() * 40);
      }
      await sleep(350);
      setDraft("");
    };

    const search = async (id: string, hit: string | null) => {
      push({ id, kind: "search", docs: docs.map(() => "idle"), found: false });
      for (let i = 0; i < docs.length; i++) {
        patch(id, {
          docs: docs.map((doc, j) =>
            j < i ? (doc === hit ? "hit" : "miss") : j === i ? "scan" : "idle",
          ),
        });
        await sleep(260);
      }
      patch(id, {
        docs: docs.map((doc) => (doc === hit ? "hit" : "miss")),
        found: hit !== null,
        result: hit ? "2 passages matched" : "No close match",
      });
      await sleep(550);
    };

    const stream = async (id: string, text: string) => {
      push({ id, kind: "agent", text: "" });
      const words = text.split(" ");
      for (let i = 1; i <= words.length; i++) {
        patch(id, { text: words.slice(0, i).join(" ") });
        await sleep(55);
      }
    };

    const play = async () => {
      for (let round = 0; !signal.aborted; round++) {
        const key = (name: string) => `${round}-${name}`;
        setMessages([]);
        setDraft("");
        await sleep(700);

        await type(first.question);
        push({ id: key("q1"), kind: "customer", text: first.question });
        await sleep(400);
        await search(key("s1"), first.hit);
        push({ id: key("p1"), kind: "passage" });
        await sleep(900);
        await stream(key("a1"), first.answer);
        await sleep(250);
        patch(key("a1"), { source: first.source });
        await sleep(2600);

        await type(second.question);
        push({ id: key("q2"), kind: "customer", text: second.question });
        await sleep(400);
        await search(key("s2"), null);
        await stream(key("a2"), second.answer);
        await sleep(300);
        patch(key("a2"), { handoff: "offer" });
        await sleep(1300);
        patch(key("a2"), { handoff: "sent" });
        await sleep(500);
        push({ id: key("h2"), kind: "system", text: second.handoff });
        await sleep(5500);
      }
    };

    // Rejections here are only the abort on unmount or scroll-away.
    play().catch(() => {});
    return () => controller.abort();
  }, [enabled]);

  return { messages, draft };
}

const docStateClass: Record<DocState, string> = {
  idle: "border-line text-faint",
  scan: "border-accent bg-accent-soft text-accent",
  hit: "border-accent bg-accent text-accent-ink",
  miss: "border-line text-faint opacity-50",
};

function MessageView({ message }: { message: Message }) {
  switch (message.kind) {
    case "customer":
      return (
        <div className="flex justify-end">
          <div className="max-w-[82%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-sm text-accent-ink shadow-sm">
            {message.text}
          </div>
        </div>
      );
    case "search":
      return (
        <div className="ml-8 flex flex-col gap-2 rounded-2xl border border-dashed border-line-strong bg-surface-2/60 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-muted">
            {message.result ? (
              message.found ? (
                <CheckIcon className="size-3.5 text-accent" />
              ) : (
                <SearchIcon className="size-3.5 text-cite" />
              )
            ) : (
              <SearchIcon className="size-3.5 animate-pulse text-accent" />
            )}
            <span className={cn(message.result && !message.found && "text-cite")}>
              {message.result ?? "Searching Pinebrook docs"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {docs.map((doc, i) => (
              <span
                key={doc}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all duration-300",
                  docStateClass[message.docs[i]],
                )}
              >
                {doc}
              </span>
            ))}
          </div>
        </div>
      );
    case "passage":
      return (
        <div className="ml-8 rounded-xl border border-line bg-bg px-3 py-2.5 text-xs leading-relaxed text-muted">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-ink">
            <DocIcon className="size-3.5 text-cite" />
            {first.passage.source}
          </div>
          {first.passage.before}
          <mark className="rounded bg-cite-soft px-0.5 text-ink">{first.passage.highlight}</mark>
        </div>
      );
    case "agent":
      return (
        <div className="flex items-end gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <SparkleIcon className="size-3.5" />
          </span>
          <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-bg px-3.5 py-2.5 text-sm leading-relaxed text-ink">
            {message.text}
            {message.source && (
              <motion.span
                initial={{ opacity: 0, y: 4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: easeOut }}
                className="mt-2 flex w-fit items-center gap-1.5 rounded-full bg-cite-soft px-2.5 py-1 text-xs font-medium text-cite"
              >
                <DocIcon className="size-3" />
                Source: {message.source}
              </motion.span>
            )}
            {message.handoff && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-2 flex w-fit items-center gap-1.5 rounded-full border border-accent px-2.5 py-1 text-xs font-medium transition-colors duration-300",
                  message.handoff === "sent" ? "bg-accent text-accent-ink" : "text-accent",
                )}
              >
                <UserIcon className="size-3" />
                {message.handoff === "sent" ? "Connecting you to the team" : "Talk to a person"}
              </motion.span>
            )}
          </div>
        </div>
      );
    case "system":
      return (
        <div className="flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] text-muted">
            <CheckIcon className="size-3 text-accent" />
            {message.text}
          </span>
        </div>
      );
  }
}

function Composer({ draft }: { draft: string }) {
  return (
    <div aria-hidden="true" className="border-t border-line px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2 rounded-full border border-line bg-bg py-1.5 pr-1.5 pl-4 text-sm">
        <span className={cn("min-w-0 flex-1 truncate", draft ? "text-ink" : "text-faint")}>
          {draft || "Ask about orders, shipping, returns…"}
          {draft && (
            <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-ink" />
          )}
        </span>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full transition-colors duration-300",
            draft ? "bg-accent text-accent-ink" : "bg-surface-2 text-faint",
          )}
        >
          <SendIcon className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

export function ChatReplay() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduced = useReducedMotion();
  const { messages, draft } = useReplay(inView && reduced !== true);

  return (
    <figure className="relative">
      <div aria-hidden="true" className="absolute -inset-4 -z-10 rounded-[40px] bg-glow blur-3xl" />
      <div
        ref={ref}
        className="overflow-hidden rounded-[28px] border border-line-strong/70 bg-surface/85 shadow-card backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-ink font-display text-xl text-bg italic">
            P
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Pinebrook Supply</p>
            <p className="text-xs text-faint">Support, answering from 5 docs</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-accent" />
            Replay
          </span>
        </div>

        <div
          aria-hidden="true"
          className="flex h-[440px] flex-col justify-end gap-3 overflow-hidden px-4 pb-4 [mask-image:linear-gradient(to_bottom,transparent,black_22%)] sm:h-[460px] sm:px-5 motion-reduce:hidden"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                layout="position"
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                transition={{ duration: 0.45, ease: easeOut }}
              >
                <MessageView message={message} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Reduced motion gets the finished conversation, no playback. */}
        <div aria-hidden="true" className="hidden flex-col gap-3 px-4 py-4 sm:px-5 motion-reduce:flex">
          {finalTranscript.map((message) => (
            <MessageView key={message.id} message={message} />
          ))}
        </div>

        <Composer draft={draft} />
      </div>
      <figcaption className="mt-4 text-center text-xs text-faint">
        Replay of a conversation on Pinebrook Supply, a fictional store.
        <span className="sr-only">
          {" "}
          Customer: {first.question} Sourced AI: {first.answer} Source: {first.source}. Customer:{" "}
          {second.question} Sourced AI: {second.answer} {second.handoff}.
        </span>
      </figcaption>
    </figure>
  );
}
