import { includesTestTraffic } from "../http/caller-context";
import { responseHandler } from "../http/response-handler";
import { analyticsService, type AnalyticsService } from "../services/analytics-service";
import { parseOverviewDays } from "../validators/admin-dashboard-validator";
import { serializeOverview } from "./admin-serializers";

export class AdminOverviewController {
  constructor(private readonly service: Pick<AnalyticsService, "overview">) {}

  show = async (request: Request): Promise<Response> => {
    try {
      const overview = await this.service.overview(parseOverviewDays(request.url), includesTestTraffic(request));
      return responseHandler.ok("Overview retrieved", { overview: serializeOverview(overview) });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };
}

export const adminOverviewController = new AdminOverviewController(analyticsService);
