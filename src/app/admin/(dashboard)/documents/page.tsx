import type { Metadata } from "next";
import { PageHeader } from "@/features/admin/AdminShell";
import { DocumentLibrary } from "@/features/admin/DocumentLibrary";

export const metadata: Metadata = { title: "Documents | Sourced AI admin" };

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="Documents"
        description="The help docs Sourced AI answers from. Add, replace or remove a doc and the chat uses the change on the next question."
      />
      <DocumentLibrary />
    </>
  );
}
