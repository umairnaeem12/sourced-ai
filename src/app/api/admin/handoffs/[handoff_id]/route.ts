import { adminReportController } from "@/server/controllers/admin-report-controller";

export const GET = adminReportController.handoff;
export const PATCH = adminReportController.updateHandoff;
