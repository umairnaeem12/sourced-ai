"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { demoStore } from "@/features/landing/content";
import { SendIcon, SparkleIcon, UserIcon } from "@/features/landing/icons";
import { easeOut } from "@/features/landing/motion";
import { MessageBubble, TypingIndicator, type ChatMessage } from "./MessageBubble";
import { createHandoff } from "./handoffsApi";
import { HandoffForm } from "./HandoffForm";
import { askQuestion } from "./questionsApi";

const MAX_LENGTH = 500;

type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
type NewMessage = WithoutId<ChatMessage>;
type HandoffState = "closed" | "open" | "sending" | "sent";

// crypto.randomUUID needs HTTPS; getRandomValues also works when testing on a LAN address.
function newConversationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function EmptyState({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="m-auto flex max-w-sm flex-col items-center gap-5 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <SparkleIcon className="size-6" />
      </span>
      <div>
        <p className="font-medium">Ask anything about orders, shipping or returns</p>
        <p className="mt-1 text-sm text-muted">
          Answers come from {demoStore.name}&rsquo;s help docs, with the source attached.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        {demoStore.questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onPick(question)}
            className="rounded-xl border border-line bg-bg px-4 py-2.5 text-left text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ChatPanelProps {
  // Spec 005: the live count from the database; the static list is the fallback.
  docCount?: number;
}

export function ChatPanel({ docCount = demoStore.docs.length }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [conversationId] = useState(newConversationId);
  const [handoff, setHandoff] = useState<HandoffState>("closed");
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const log = logRef.current;
    log?.scrollTo?.({ top: log.scrollHeight, behavior: "smooth" });
  }, [messages, pending, handoff]);

  // Refocus after a reply; focusing on load would pop the keyboard open on phones.
  const hasMessages = messages.length > 0;
  useEffect(() => {
    if (!pending && hasMessages) inputRef.current?.focus();
  }, [pending, hasMessages]);

  const add = (message: NewMessage) =>
    setMessages((current) => [...current, { ...message, id: String(nextId.current++) } as ChatMessage]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || pending) return;
    add({ role: "customer", text });
    setDraft("");
    setPending(true);
    const result = await askQuestion(text, conversationId);
    add(result.ok ? { role: "agent", answer: result.answer } : { role: "error", text: result.message });
    setPending(false);
  }

  // The server needs at least one logged question to build the handoff.
  const hasReply = messages.some((message) => message.role === "agent");
  const canHandOff = hasReply && !pending && handoff === "closed";

  function openHandoff() {
    setHandoffError(null);
    setHandoff("open");
  }

  async function sendHandoff(email: string) {
    setHandoff("sending");
    const result = await createHandoff(conversationId, email);
    if (result.ok || result.code === "HANDOFF_ALREADY_SENT") {
      add(
        result.ok
          ? {
              role: "system",
              text: `Sent to the ${demoStore.name} team`,
              detail: email
                ? `They\u2019ll reply to you at ${email}.`
                : "They can\u2019t reply without an email, but they\u2019ll see what you needed.",
            }
          : { role: "system", text: result.message },
      );
      setHandoff("sent");
      return;
    }
    setHandoffError(result.message);
    setHandoff("open");
  }

  return (
    <section
      aria-labelledby="chat-title"
      className="flex h-[calc(100dvh-6rem)] min-h-130 flex-col overflow-hidden rounded-[28px] border border-line-strong/70 bg-surface/85 shadow-card backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-ink font-display text-xl text-bg italic">
          P
        </span>
        <div className="min-w-0 flex-1">
          <h1 id="chat-title" className="text-sm font-semibold">
            {demoStore.name} support
          </h1>
          <p className="text-xs text-faint">Answers from {docCount} help {docCount === 1 ? "doc" : "docs"}</p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted sm:flex">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-accent" />
          Live
        </span>
        <button
          type="button"
          onClick={openHandoff}
          disabled={!canHandOff}
          title={hasReply ? undefined : "Ask a question first"}
          className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <UserIcon className="size-3.5" />
          {handoff === "sent" ? "Team notified" : "Talk to a person"}
        </button>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-5"
      >
        {messages.length === 0 && !pending ? (
          <EmptyState onPick={ask} />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: easeOut }}
              >
                <MessageBubble message={message} onTalkToPerson={canHandOff ? openHandoff : undefined} />
              </motion.div>
            ))}
            {(handoff === "open" || handoff === "sending") && (
              <motion.div
                key="handoff"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: easeOut }}
              >
                <HandoffForm
                  storeName={demoStore.name}
                  sending={handoff === "sending"}
                  error={handoffError}
                  onSend={sendHandoff}
                  onCancel={() => setHandoff("closed")}
                />
              </motion.div>
            )}
            {pending && (
              <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(draft);
        }}
        className="border-t border-line p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg p-1.5 pl-4 transition-colors focus-within:border-accent">
          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <textarea
            ref={inputRef}
            id="question"
            rows={1}
            value={draft}
            maxLength={MAX_LENGTH}
            disabled={pending}
            placeholder={"Ask about orders, shipping, returns…"}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void ask(draft);
              }
            }}
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm text-ink outline-none field-sizing-content placeholder:text-faint disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={pending || !draft.trim()}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              draft.trim() && !pending ? "bg-accent text-accent-ink hover:bg-accent-strong" : "bg-surface-2 text-faint",
            )}
          >
            <SendIcon />
          </button>
        </div>
        <p className="mt-2 flex justify-between px-1 text-[11px] text-faint">
          <span>Enter to send, Shift + Enter for a new line</span>
          {draft.length > MAX_LENGTH - 100 && (
            <span>
              {draft.length}/{MAX_LENGTH}
            </span>
          )}
        </p>
      </form>
    </section>
  );
}
