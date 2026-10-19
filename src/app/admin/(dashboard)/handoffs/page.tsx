import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/features/admin/AdminShell";
import { HandoffInbox } from "@/features/admin/HandoffInbox";

export const metadata: Metadata = { title: "Inbox | Sourced AI admin" };

export default function HandoffsPage() {
  return (
    <>
      <PageHeader
        title="Inbox"
        description="Conversations customers handed to the team. Open one to read it, reply by email, add notes and mark it handled."
      />
      {/* HandoffInbox reads ?handoff= with useSearchParams, which needs a Suspense boundary. */}
      <Suspense>
        <HandoffInbox />
      </Suspense>
    </>
  );
}
