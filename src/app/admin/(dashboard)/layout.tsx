import { headers } from "next/headers";
import { AdminShell } from "@/features/admin/AdminShell";
import { isAdminPublic } from "@/server/auth/admin-access";
import { includesTestTraffic } from "@/server/http/caller-context";
import { logger } from "@/server/logger";
import { adminReportService } from "@/server/services/admin-report-service";
import { analyticsService } from "@/server/services/analytics-service";

// The sidebar count and sample notice are read per request; router.refresh() updates them.
export const dynamic = "force-dynamic";

async function shellData(): Promise<{ openHandoffs: number; hasSampleData: boolean }> {
  const includeTest = includesTestTraffic(await headers());
  try {
    const [openHandoffs, hasSampleData] = await Promise.all([
      adminReportService.openHandoffCount(includeTest),
      analyticsService.hasSampleData(),
    ]);
    return { openHandoffs, hasSampleData };
  } catch (error) {
    // The pages show their own errors; the frame still renders.
    logger.warn("Admin shell data unavailable", { error: error instanceof Error ? error.message : String(error) });
    return { openHandoffs: 0, hasSampleData: false };
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { openHandoffs, hasSampleData } = await shellData();
  return (
    <AdminShell openHandoffs={openHandoffs} hasSampleData={hasSampleData} isPublic={isAdminPublic()}>
      {children}
    </AdminShell>
  );
}
