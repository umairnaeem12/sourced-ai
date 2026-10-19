export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  // Spec 002: every AI provider is out of free-tier quota; the chat shows "busy, try again".
  AI_RATE_LIMITED = "AI_RATE_LIMITED",
  // Spec 002: provider down or not configured.
  AI_UNAVAILABLE = "AI_UNAVAILABLE",
  // Spec 003: handoff asked for before any question was logged.
  CONVERSATION_NOT_FOUND = "CONVERSATION_NOT_FOUND",
  // Spec 003: one handoff per conversation; the chat shows "Team notified".
  HANDOFF_ALREADY_SENT = "HANDOFF_ALREADY_SENT",
  // Spec 003 amendment: inbox detail or update for an id that doesn't exist.
  HANDOFF_NOT_FOUND = "HANDOFF_NOT_FOUND",
  // Spec 003: admin endpoints without a valid session cookie.
  UNAUTHENTICATED = "UNAUTHENTICATED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  // Spec 003: ADMIN_PASSWORD unset or shorter than 6 characters (owner amendment).
  ADMIN_DISABLED = "ADMIN_DISABLED",
  // Spec 004: one visitor went over a per-visitor limit; context.retry_after_seconds says when to retry.
  RATE_LIMITED = "RATE_LIMITED",
  // Spec 004: the demo-wide daily question cap is used up.
  DAILY_LIMIT_REACHED = "DAILY_LIMIT_REACHED",
  // Spec 005: gap group id with no questions behind it.
  GAP_NOT_FOUND = "GAP_NOT_FOUND",
  // Spec 005: document id unknown or already deleted.
  DOCUMENT_NOT_FOUND = "DOCUMENT_NOT_FOUND",
  // Spec 005: wrong file type, over 2 MB, or no text to index; the message says which.
  DOCUMENT_INVALID = "DOCUMENT_INVALID",
  // Spec 005: the 25-document cap; context.limit carries it.
  DOCUMENT_LIMIT_REACHED = "DOCUMENT_LIMIT_REACHED",
  // Spec 005: test alert for a channel whose settings are missing.
  NOTIFICATION_NOT_CONFIGURED = "NOTIFICATION_NOT_CONFIGURED",
  // Spec 005: test alert reached the channel but delivery failed; context.detail says why.
  NOTIFICATION_FAILED = "NOTIFICATION_FAILED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code: ErrorCode,
    readonly isOperational = true,
    readonly context?: Record<string, unknown>,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}
