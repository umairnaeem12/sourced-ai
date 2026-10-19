import { adminSessionController } from "@/server/controllers/admin-session-controller";

export const POST = adminSessionController.create;
export const DELETE = adminSessionController.remove;
