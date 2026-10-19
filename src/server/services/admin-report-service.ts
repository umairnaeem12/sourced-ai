import { loadConfig } from "../config";
import { ApiError, ErrorCode } from "../http/api-error";
import { gapRepository, type GapRepository } from "../repositories/gap-repository";
import {
  handoffRepository,
  type HandoffListRow,
  type HandoffNote,
  type HandoffRepository,
  type HandoffStatusFilter,
} from "../repositories/handoff-repository";
import {
  questionRepository,
  type GapRow,
  type GapStatus,
  type LoggedQuestion,
  type QuestionRepository,
} from "../repositories/question-repository";
import type { ListQuery } from "../validators/list-query-validator";

export interface GapReport {
  rows: GapRow[];
  total: number;
  summary: {
    questions: number;
    answered: number;
    unanswered: number;
    handoffs_sent: number;
    days: number;
  };
}

export interface HandoffDetail extends HandoffListRow {
  conversation: LoggedQuestion[];
  notes: HandoffNote[];
}

export class AdminReportService {
  constructor(
    private readonly questions: Pick<QuestionRepository, "listGaps" | "summary" | "findByConversation" | "gapExists">,
    private readonly handoffs: Pick<
      HandoffRepository,
      "list" | "countSince" | "countOpen" | "findById" | "setHandled" | "listNotes" | "addNote"
    >,
    private readonly gaps: Pick<GapRepository, "resolve" | "reopen">,
    private readonly timeZone: () => string,
  ) {}

  async gapReport(query: ListQuery, status: GapStatus, includeTest: boolean): Promise<GapReport> {
    const [{ rows, total }, summary, handoffsSent] = await Promise.all([
      this.questions.listGaps({ ...query, status, include_test: includeTest, time_zone: this.timeZone() }),
      this.questions.summary(query.days, includeTest),
      this.handoffs.countSince(query.days, includeTest),
    ]);
    return { rows, total, summary: { ...summary, handoffs_sent: handoffsSent, days: query.days } };
  }

  async setGapResolved(gapId: string, isResolved: boolean, includeTest: boolean): Promise<{ gap_id: string; is_resolved: boolean }> {
    if (!(await this.questions.gapExists(gapId, includeTest))) {
      throw new ApiError(404, "Gap not found", ErrorCode.GAP_NOT_FOUND);
    }
    if (isResolved) await this.gaps.resolve(gapId);
    else await this.gaps.reopen(gapId);
    return { gap_id: gapId, is_resolved: isResolved };
  }

  async handoffList(
    query: ListQuery,
    status: HandoffStatusFilter,
    includeTest: boolean,
  ): Promise<{ rows: HandoffListRow[]; total: number; open: number }> {
    const [{ rows, total }, open] = await Promise.all([
      this.handoffs.list(status, query.page, query.page_size, includeTest),
      this.handoffs.countOpen(includeTest),
    ]);
    return { rows, total, open };
  }

  async openHandoffCount(includeTest: boolean): Promise<number> {
    return this.handoffs.countOpen(includeTest);
  }

  async handoffDetail(id: string): Promise<HandoffDetail> {
    const handoff = await this.requireHandoff(id);
    const [conversation, notes] = await Promise.all([
      this.questions.findByConversation(handoff.conversation_id),
      this.handoffs.listNotes(id),
    ]);
    return { ...handoff, conversation, notes };
  }

  async setHandled(id: string, isHandled: boolean): Promise<HandoffListRow> {
    const updated = await this.handoffs.setHandled(id, isHandled);
    const handoff = updated ? await this.handoffs.findById(id) : null;
    if (!handoff) throw new ApiError(404, "Handoff not found", ErrorCode.HANDOFF_NOT_FOUND);
    return handoff;
  }

  async addNote(id: string, body: string): Promise<HandoffNote> {
    await this.requireHandoff(id);
    return this.handoffs.addNote(id, body);
  }

  private async requireHandoff(id: string): Promise<HandoffListRow> {
    const handoff = await this.handoffs.findById(id);
    if (!handoff) throw new ApiError(404, "Handoff not found", ErrorCode.HANDOFF_NOT_FOUND);
    return handoff;
  }
}

export const adminReportService = new AdminReportService(
  questionRepository,
  handoffRepository,
  gapRepository,
  () => loadConfig().STORE_TIMEZONE,
);
