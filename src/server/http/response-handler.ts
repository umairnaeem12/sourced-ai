import { ZodError } from "zod";
import { logger } from "../logger";
import { ApiError, ErrorCode } from "./api-error";

interface FieldError {
  field: string;
  message: string;
}

export const responseHandler = {
  ok<T>(message: string, data: T): Response {
    return Response.json({ success: true, message, data });
  },

  created<T>(message: string, data: T): Response {
    return Response.json({ success: true, message, data }, { status: 201 });
  },

  noContent(headers?: HeadersInit): Response {
    return new Response(null, { status: 204, headers });
  },

  fromError(error: unknown): Response {
    if (error instanceof ZodError) {
      const errors: FieldError[] = error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      }));
      return Response.json(
        { success: false, message: "Validation failed", code: ErrorCode.VALIDATION_ERROR, errors },
        { status: 400 },
      );
    }

    if (error instanceof ApiError) {
      const log = error.isOperational ? logger.warn : logger.error;
      log("ApiError", {
        code: error.code,
        status_code: error.statusCode,
        cause: error.cause instanceof Error ? error.cause.message : undefined,
      });
      const retryAfter = error.context?.retry_after_seconds;
      return Response.json(
        { success: false, message: error.message, code: error.code, context: error.context },
        {
          status: error.statusCode,
          headers: typeof retryAfter === "number" ? { "retry-after": String(retryAfter) } : undefined,
        },
      );
    }

    logger.error("Unhandled error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json(
      { success: false, message: "Something went wrong", code: ErrorCode.INTERNAL_ERROR },
      { status: 500 },
    );
  },
};
