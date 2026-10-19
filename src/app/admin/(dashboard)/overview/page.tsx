import type { Metadata } from "next";
import { PageHeader } from "@/features/admin/AdminShell";
import { OverviewDashboard } from "@/features/admin/OverviewDashboard";

export const metadata: Metadata = { title: "Overview | Sourced AI admin" };

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="How Sourced AI is doing with your customers: questions, answers from the docs, and what still needs the team."
      />
      <OverviewDashboard />
    </>
  );
}
