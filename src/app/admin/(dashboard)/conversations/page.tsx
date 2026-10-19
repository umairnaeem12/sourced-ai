import type { Metadata } from "next";
import { PageHeader } from "@/features/admin/AdminShell";
import { ConversationList } from "@/features/admin/ConversationList";

export const metadata: Metadata = { title: "Conversations | Sourced AI admin" };

export default function ConversationsPage() {
  return (
    <>
      <PageHeader
        title="Conversations"
        description="Every chat with the assistant, answered or not, with the sources each answer used."
      />
      <ConversationList />
    </>
  );
}
