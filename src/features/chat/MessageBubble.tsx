"use client";

import { AnimatePresence } from "motion/react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { CheckIcon, SparkleIcon, UserIcon } from "@/features/landing/icons";
import type { Answer } from "./questionsApi";
import { SourcePanel } from "./SourcePanel";

export type ChatMessage =
  | { id: string; role: "customer"; text: string }
  | { id: string; role: "agent"; answer: Answer }
  | { id: string; role: "error"; text: string }
  | { id: string; role: "system"; text: string; detail?: string };

function AgentAvatar() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
      <SparkleIcon className="size-3.5" />
    </span>
  );
}

interface AgentAnswerProps {
  answer: Answer;
  onTalkToPerson?: () => void;
}

function AgentAnswer({ answer, onTalkToPerson }: AgentAnswerProps) {
  const [openNumber, setOpenNumber] = useState<number | null>(null);
  const baseId = useId();
  const open = answer.citations.find((citation) => citation.number === openNumber);

  return (
    <div className="flex items-end gap-2">
      <AgentAvatar />
      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-line bg-bg px-4 py-3 text-sm leading-relaxed text-ink sm:max-w-[80%]">
        <p>{answer.text}</p>
        {answer.is_answered ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {answer.citations.map((citation) => {
              const isOpen = citation.number === openNumber;
              return (
                <button
                  key={citation.number}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${baseId}-${citation.number}`}
                  aria-label={`Source ${citation.number}: ${citation.document_title}`}
                  onClick={() => setOpenNumber(isOpen ? null : citation.number)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cite",
                    isOpen ? "bg-cite text-bg" : "bg-cite-soft text-cite hover:bg-cite/20",
                  )}
                >
                  <span className="font-mono">{citation.number}</span>
                  {citation.document_title}
                  <span className="opacity-70">&sect;{citation.section_number}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-xs text-faint">Not covered by the docs</p>
            {onTalkToPerson && (
              <button
                type="button"
                onClick={onTalkToPerson}
                className="flex items-center gap-1.5 rounded-full border border-accent px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <UserIcon className="size-3" />
                Talk to a person
              </button>
            )}
          </div>
        )}
        <AnimatePresence initial={false}>
          {open && <SourcePanel key={open.number} id={`${baseId}-${open.number}`} citation={open} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  // Present only while a handoff can still be started.
  onTalkToPerson?: () => void;
}

export function MessageBubble({ message, onTalkToPerson }: MessageBubbleProps) {
  if (message.role === "customer") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm whitespace-pre-line text-accent-ink shadow-sm sm:max-w-[75%]">
          {message.text}
        </p>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="flex items-end gap-2">
        <AgentAvatar />
        <p
          role="alert"
          className="max-w-[85%] rounded-2xl rounded-bl-md border border-cite/40 bg-cite-soft px-4 py-2.5 text-sm text-cite"
        >
          {message.text}
        </p>
      </div>
    );
  }

  if (message.role === "system") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-1 rounded-2xl border border-accent/30 bg-accent-soft/60 px-4 py-3 text-center">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <CheckIcon className="size-3.5 text-accent" />
          {message.text}
        </p>
        {message.detail && <p className="text-xs text-muted">{message.detail}</p>}
      </div>
    );
  }

  return <AgentAnswer answer={message.answer} onTalkToPerson={onTalkToPerson} />;
}

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <AgentAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-bg px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="size-1.5 animate-bounce rounded-full bg-faint motion-reduce:animate-none"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
        <span className="sr-only">Sourced AI is checking the docs</span>
      </div>
    </div>
  );
}
