import { callerOf } from "../http/caller-context";
import { responseHandler } from "../http/response-handler";
import { questionService, type AnswerResult, type QuestionService } from "../services/question-service";
import { createQuestionSchema } from "../validators/question-validator";

function serializeAnswer(answer: AnswerResult) {
  return {
    is_answered: answer.is_answered,
    text: answer.text,
    citations: answer.citations.map((citation) => ({
      number: citation.number,
      document_slug: citation.document_slug,
      document_title: citation.document_title,
      section_number: citation.section_number,
      heading: citation.heading,
      content: citation.content,
    })),
  };
}

export class QuestionController {
  constructor(private readonly service: Pick<QuestionService, "answer">) {}

  create = async (request: Request): Promise<Response> => {
    try {
      const body: unknown = await request.json().catch(() => null);
      const input = createQuestionSchema.parse(body);
      const answer = await this.service.answer(input.question, input.conversation_id ?? null, callerOf(request));
      return responseHandler.ok(
        answer.is_answered ? "Question answered" : "No answer found in the docs",
        { answer: serializeAnswer(answer) },
      );
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };
}

export const questionController = new QuestionController(questionService);
