import { z } from "zod";
import { includesTestTraffic } from "../http/caller-context";
import { responseHandler } from "../http/response-handler";
import { adminReportService, type AdminReportService } from "../services/admin-report-service";
import { createNoteSchema, gapIdSchema, parseGapStatus, updateGapSchema } from "../validators/admin-dashboard-validator";
import { handoffIdSchema, parseHandoffStatus, updateHandoffSchema } from "../validators/handoff-admin-validator";
import { buildPaginationMeta, parseListQuery } from "../validators/list-query-validator";
import { serializeGap, serializeHandoff, serializeHandoffDetail, serializeNote } from "./admin-serializers";

interface HandoffRouteContext {
  params: Promise<{ handoff_id: string }>;
}

interface GapRouteContext {
  params: Promise<{ gap_id: string }>;
}

async function handoffIdOf(context: HandoffRouteContext): Promise<string> {
  const { handoff_id } = await context.params;
  return z.object({ handoff_id: handoffIdSchema }).parse({ handoff_id }).handoff_id;
}

async function jsonBody(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

export class AdminReportController {
  constructor(
    private readonly service: Pick<
      AdminReportService,
      "gapReport" | "setGapResolved" | "handoffList" | "handoffDetail" | "setHandled" | "addNote"
    >,
  ) {}

  gaps = async (request: Request): Promise<Response> => {
    try {
      const query = parseListQuery(request.url);
      const report = await this.service.gapReport(query, parseGapStatus(request.url), includesTestTraffic(request));
      return responseHandler.ok("Gap report retrieved", {
        gaps: report.rows.map(serializeGap),
        summary: report.summary,
        pagination: buildPaginationMeta(query.page, query.page_size, report.total),
      });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  updateGap = async (request: Request, context: GapRouteContext): Promise<Response> => {
    try {
      const { gap_id } = await context.params;
      const gapId = z.object({ gap_id: gapIdSchema }).parse({ gap_id }).gap_id;
      const { is_resolved } = updateGapSchema.parse(await jsonBody(request));
      const gap = await this.service.setGapResolved(gapId, is_resolved, includesTestTraffic(request));
      return responseHandler.ok(is_resolved ? "Gap marked doc written" : "Gap reopened", { gap });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  handoffs = async (request: Request): Promise<Response> => {
    try {
      const query = parseListQuery(request.url);
      const status = parseHandoffStatus(request.url);
      const { rows, total, open } = await this.service.handoffList(query, status, includesTestTraffic(request));
      return responseHandler.ok("Handoffs retrieved", {
        handoffs: rows.map(serializeHandoff),
        open_count: open,
        pagination: buildPaginationMeta(query.page, query.page_size, total),
      });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  handoff = async (_request: Request, context: HandoffRouteContext): Promise<Response> => {
    try {
      const handoff = await this.service.handoffDetail(await handoffIdOf(context));
      return responseHandler.ok("Handoff retrieved", { handoff: serializeHandoffDetail(handoff) });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  updateHandoff = async (request: Request, context: HandoffRouteContext): Promise<Response> => {
    try {
      const id = await handoffIdOf(context);
      const { is_handled } = updateHandoffSchema.parse(await jsonBody(request));
      const handoff = await this.service.setHandled(id, is_handled);
      return responseHandler.ok(is_handled ? "Handoff marked handled" : "Handoff reopened", {
        handoff: serializeHandoff(handoff),
      });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  createNote = async (request: Request, context: HandoffRouteContext): Promise<Response> => {
    try {
      const id = await handoffIdOf(context);
      const { body } = createNoteSchema.parse(await jsonBody(request));
      const note = await this.service.addNote(id, body);
      return responseHandler.created("Note added", { note: serializeNote(note) });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };
}

export const adminReportController = new AdminReportController(adminReportService);
