import type { Metadata } from "next";
import { PageHeader } from "@/features/admin/AdminShell";
import { SettingsView } from "@/features/admin/SettingsView";

export const metadata: Metadata = { title: "Settings | Sourced AI admin" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="How Sourced AI is set up. These values come from environment variables, so change them where the app is hosted and redeploy."
      />
      <SettingsView />
    </>
  );
}
