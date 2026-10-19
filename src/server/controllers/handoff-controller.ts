import { after } from "next/server";
import { callerOf } from "../http/caller-context";
import { responseHandler } from "../http/response-handler";
import { handoffService, type HandoffService } from "../services/handoff-service";
import { createHandoffSchema } from "../validators/handoff-validator";

type Schedule = (task: () => Promise<void>) => void;

export class HandoffController {
  constructor(
    private readonly service: Pick<HandoffService, "create" | "notify">,
    // Next's after() runs the task once the response is sent; tests pass their own.
    private readonly schedule: Schedule = (task) => after(task),
  ) {}

  create = async (request: Request): Promise<Response> => {
    try {
      const body: unknown = await request.json().catch(() => null);
      const input = createHandoffSchema.parse(body);
      const handoff = await this.service.create(input.conversation_id, input.email ?? null, callerOf(request));
      this.schedule(() => this.service.notify(handoff.id));
      return responseHandler.created("Handoff received", { handoff: { id: handoff.id, status: handoff.status } });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };
}

export const handoffController = new HandoffController(handoffService);
