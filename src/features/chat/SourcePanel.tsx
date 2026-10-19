import { motion } from "motion/react";
import { DocIcon } from "@/features/landing/icons";
import { easeOut } from "@/features/landing/motion";
import type { Citation } from "./questionsApi";

interface SourcePanelProps {
  id: string;
  citation: Citation;
}

export function SourcePanel({ id, citation }: SourcePanelProps) {
  return (
    <motion.div
      id={id}
      role="region"
      aria-label={`Source ${citation.number}: ${citation.document_title}`}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: easeOut }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-xl border border-cite/30 bg-surface p-3 text-xs leading-relaxed text-muted">
        <p className="mb-1.5 flex items-start gap-1.5 font-medium text-ink">
          <DocIcon className="mt-px size-3.5 text-cite" />
          <span>
            {citation.document_title}, section {citation.section_number}: {citation.heading}
          </span>
        </p>
        <p className="whitespace-pre-line">{citation.content}</p>
      </div>
    </motion.div>
  );
}
