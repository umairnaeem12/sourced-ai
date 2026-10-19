import type { Metadata } from "next";
import { PageHeader } from "@/features/admin/AdminShell";
import { GapReport } from "@/features/admin/GapReport";

export const metadata: Metadata = { title: "Gap report | Sourced AI admin" };

export default function GapReportPage() {
  return (
    <>
      <PageHeader
        title="Gap report"
        description="Questions Sourced AI couldn't answer from the docs in the last 30 days, grouped by meaning. Each one is a doc worth writing."
      />
      <GapReport />
    </>
  );
}
