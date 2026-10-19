import { loadConfig } from "../config";
import {
  analyticsRepository,
  type AnalyticsRepository,
  type BusyCell,
  type DailyCount,
  type DocumentCitationCount,
  type PeriodTotals,
} from "../repositories/analytics-repository";
import { handoffRepository, type HandoffListRow, type HandoffRepository } from "../repositories/handoff-repository";
import { questionRepository, type GapRow, type QuestionRepository } from "../repositories/question-repository";

export interface Overview {
  period: { days: number; time_zone: string };
  totals: PeriodTotals;
  previous_totals: PeriodTotals;
  daily: DailyCount[];
  top_documents: DocumentCitationCount[];
  busiest: BusyCell[];
  top_gaps: GapRow[];
  recent_handoffs: HandoffListRow[];
  has_sample_data: boolean;
}

const LIST_SIZE = 5;

export class AnalyticsService {
  constructor(
    private readonly analytics: Pick<AnalyticsRepository, "totals" | "daily" | "topDocuments" | "busiest" | "hasSampleData">,
    private readonly questions: Pick<QuestionRepository, "listGaps">,
    private readonly handoffs: Pick<HandoffRepository, "list">,
    private readonly timeZone: () => string,
  ) {}

  async overview(days: number, includeTest: boolean): Promise<Overview> {
    const window = { days, time_zone: this.timeZone(), include_test: includeTest };
    const [totals, daily, topDocuments, busiest, gaps, handoffs, hasSampleData] = await Promise.all([
      this.analytics.totals(window),
      this.analytics.daily(window),
      this.analytics.topDocuments(window, LIST_SIZE),
      this.analytics.busiest(window),
      this.questions.listGaps({
        days,
        search: null,
        page: 1,
        page_size: LIST_SIZE,
        status: "open",
        include_test: includeTest,
        time_zone: window.time_zone,
      }),
      this.handoffs.list("open", 1, LIST_SIZE, includeTest),
      this.analytics.hasSampleData(),
    ]);
    return {
      period: { days, time_zone: window.time_zone },
      totals: totals.current,
      previous_totals: totals.previous,
      daily,
      top_documents: topDocuments,
      busiest,
      top_gaps: gaps.rows,
      recent_handoffs: handoffs.rows,
      has_sample_data: hasSampleData,
    };
  }

  async hasSampleData(): Promise<boolean> {
    return this.analytics.hasSampleData();
  }
}

export const analyticsService = new AnalyticsService(
  analyticsRepository,
  questionRepository,
  handoffRepository,
  () => loadConfig().STORE_TIMEZONE,
);
