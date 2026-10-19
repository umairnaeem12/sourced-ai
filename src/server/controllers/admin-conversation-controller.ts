import { z } from "zod";
import { includesTestTraffic } from "../http/caller-context";
import { responseHandler } from "../http/response-handler";
import { conversationService, type ConversationService } from "../services/conversation-service";
import { conversationIdSchema, parseConversationStatus } from "../validators/admin-dashboard-validator";
import { buildPaginationMeta, parseListQuery } from "../validators/list-query-validator";
import { serializeConversation, serializeConversationRow } from "./admin-serializers";

interface ConversationRouteContext {
  params: Promise<{ conversation_id: string }>;
}

export class AdminConversationController {
  constructor(private readonly service: Pick<ConversationService, "list" | "detail">) {}

  list = async (request: Request): Promise<Response> => {
    try {
      const query = parseListQuery(request.url);
      const { rows, total } = await this.service.list({
        status: parseConversationStatus(request.url),
        search: query.search,
        page: query.page,
        page_size: query.page_size,
        include_test: includesTestTraffic(request),
      });
      return responseHandler.ok("Conversations retrieved", {
        conversations: rows.map(serializeConversationRow),
        pagination: buildPaginationMeta(query.page, query.page_size, total),
      });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  show = async (request: Request, context: ConversationRouteContext): Promise<Response> => {
    try {
      const { conversation_id } = await context.params;
      const id = z.object({ conversation_id: conversationIdSchema }).parse({ conversation_id }).conversation_id;
      const conversation = await this.service.detail(id, includesTestTraffic(request));
      return responseHandler.ok("Conversation retrieved", { conversation: serializeConversation(conversation) });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };
}

export const adminConversationController = new AdminConversationController(conversationService);
