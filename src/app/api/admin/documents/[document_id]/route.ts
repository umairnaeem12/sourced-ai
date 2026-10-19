import { adminDocumentController } from "@/server/controllers/admin-document-controller";

export const GET = adminDocumentController.show;
export const PATCH = adminDocumentController.replace;
export const DELETE = adminDocumentController.remove;
