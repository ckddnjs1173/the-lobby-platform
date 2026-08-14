import type {
  ApplicationSource,
  ApplicationStage,
} from "../types";

export interface RecruitingAnalyticsStageCount {
  stage: ApplicationStage;
  count: number;
}

export interface RecruitingAnalyticsSourceCount {
  source: ApplicationSource;
  count: number;
}

export interface RecruitingAnalyticsDailyCount {
  date: string;
  count: number;
}

export interface RecruitingAnalyticsJobRow {
  jobId: string;
  jobTitle: string;
  company: string;
  applications: number;
  hired: number;
  active: number;
}

export interface RecruitingAnalyticsSummary {
  windowDays: number;
  windowStartedAt: string;
  generatedAt: string;
  organizationId: string | null;
  truncated: boolean;
  processedApplications: number;
  totalApplications: number;
  activeApplications: number;
  attentionApplications: number;
  staleApplications: number;
  interviewOrLater: number;
  offers: number;
  hired: number;
  rejected: number;
  hireRate: number;
  interviewOrLaterRate: number;
  averageDecisionDays: number | null;
  stageCounts: RecruitingAnalyticsStageCount[];
  sourceCounts: RecruitingAnalyticsSourceCount[];
  dailyApplications: RecruitingAnalyticsDailyCount[];
  topJobs: RecruitingAnalyticsJobRow[];
}
