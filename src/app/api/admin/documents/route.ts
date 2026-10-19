import { adminDocumentController } from "@/server/controllers/admin-document-controller";

export const GET = adminDocumentController.list;
export const POST = adminDocumentController.create;
