import type { BusyCell, DailyCount, DocumentCitationCount, PeriodTotals } from "../repositories/analytics-repository";
import type { ConversationMessage, ConversationRow } from "../repositories/conversation-repository";
import type { HandoffListRow, HandoffNote } from "../repositories/handoff-repository";
import type { GapRow, LoggedQuestion, StoredCitation } from "../repositories/question-repository";
import type { Overview } from "../services/analytics-service";
import type { ConversationDetail } from "../services/conversation-service";
import type { HandoffDetail } from "../services/admin-report-service";
import { notificationProblem } from "../services/notification-status";

export function serializeCitation(citation: StoredCitation) {
  return {
    number: citation.number,
    document_slug: citation.document_slug,
    document_title: citation.document_title,
    section_number: citation.section_number,
    heading: citation.heading,
    content: citation.content,
  };
}

export function serializeMessage(message: LoggedQuestion | ConversationMessage) {
  return {
    question: message.question,
    answer_text: message.answer_text,
    is_answered: message.is_answered,
    citations: message.citations.map(serializeCitation),
    created_at: message.created_at.toISOString(),
  };
}

export function serializeGap(gap: GapRow) {
  return {
    gap_id: gap.gap_id,
    question: gap.question,
    wordings: gap.wordings,
    times_asked: gap.times_asked,
    last_asked_at: gap.last_asked_at.toISOString(),
    daily_counts: gap.daily_counts,
    resolved_at: gap.resolved_at?.toISOString() ?? null,
    asked_again: gap.asked_again,
  };
}

export function serializeHandoff(handoff: HandoffListRow) {
  return {
    id: handoff.id,
    conversation_id: handoff.conversation_id,
    created_at: handoff.created_at.toISOString(),
    email: handoff.email,
    question_count: handoff.question_count,
    is_handled: handoff.handled_at !== null,
    handled_at: handoff.handled_at?.toISOString() ?? null,
    notifications: handoff.notifications.map((notification) => ({
      channel: notification.channel,
      status: notification.status,
      problem: notificationProblem(notification),
      error: notification.error,
    })),
  };
}

export function serializeNote(note: HandoffNote) {
  return { id: note.id, body: note.body, created_at: note.created_at.toISOString() };
}

export function serializeHandoffDetail(handoff: HandoffDetail) {
  return {
    ...serializeHandoff(handoff),
    conversation: handoff.conversation.map(serializeMessage),
    notes: handoff.notes.map(serializeNote),
  };
}

export function serializeConversationRow(row: ConversationRow) {
  return {
    conversation_id: row.conversation_id,
    started_at: row.started_at.toISOString(),
    last_message_at: row.last_message_at.toISOString(),
    first_question: row.first_question,
    questions: row.questions,
    answered: row.answered,
    handoff_id: row.handoff_id,
  };
}

export function serializeConversation(detail: ConversationDetail) {
  return {
    conversation_id: detail.conversation_id,
    started_at: detail.started_at.toISOString(),
    handoff_id: detail.handoff_id,
    messages: detail.messages.map(serializeMessage),
  };
}

function serializeTotals(totals: PeriodTotals) {
  return { ...totals };
}

export function serializeOverview(overview: Overview) {
  return {
    period: overview.period,
    totals: serializeTotals(overview.totals),
    previous_totals: serializeTotals(overview.previous_totals),
    daily: overview.daily.map((day: DailyCount) => ({ ...day })),
    top_documents: overview.top_documents.map((document: DocumentCitationCount) => ({ ...document })),
    busiest: overview.busiest.map((cell: BusyCell) => ({ ...cell })),
    top_gaps: overview.top_gaps.map(serializeGap),
    recent_handoffs: overview.recent_handoffs.map(serializeHandoff),
    has_sample_data: overview.has_sample_data,
  };
}
