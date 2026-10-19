import { ApiError, ErrorCode } from "../http/api-error";
import {
  conversationRepository,
  type ConversationMessage,
  type ConversationQuery,
  type ConversationRepository,
  type ConversationRow,
} from "../repositories/conversation-repository";

export interface ConversationDetail {
  conversation_id: string;
  started_at: Date;
  handoff_id: string | null;
  messages: ConversationMessage[];
}

export class ConversationService {
  constructor(private readonly conversations: Pick<ConversationRepository, "list" | "messages" | "handoffIdOf">) {}

  list(query: ConversationQuery): Promise<{ rows: ConversationRow[]; total: number }> {
    return this.conversations.list(query);
  }

  async detail(conversationId: string, includeTest: boolean): Promise<ConversationDetail> {
    const [messages, handoffId] = await Promise.all([
      this.conversations.messages(conversationId, includeTest),
      this.conversations.handoffIdOf(conversationId),
    ]);
    if (messages.length === 0) throw new ApiError(404, "Conversation not found", ErrorCode.CONVERSATION_NOT_FOUND);
    return { conversation_id: conversationId, started_at: messages[0].created_at, handoff_id: handoffId, messages };
  }
}

export const conversationService = new ConversationService(conversationRepository);
