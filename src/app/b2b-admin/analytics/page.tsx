"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useB2BSession } from "../../../components/b2b-admin/B2BSessionContext";
import {
  AnalyticsApiError,
  fetchRecruitingAnalytics,
} from "../../../lib/analyticsApi";
import type { RecruitingAnalyticsSummary } from "../../../lib/analyticsTypes";
import {
  OrganizationApiError,
  fetchB2BOrganizations,
  type B2BOrganizationView,
} from "../../../lib/organizationApi";
import type { ApplicationSource, ApplicationStage } from "../../../types";

const STAGE_LABELS: Record<ApplicationStage, string> = {
  NEW: "신규지원",
  REVIEWING: "검토중",
  CONTACTED: "연락완료",
  RECOMMEND_PENDING: "추천예정",
  RECOMMENDED: "추천완료",
  DOCUMENT_SCREEN: "서류전형",
  INTERVIEW: "면접진행",
  OFFER: "처우협의",
  HIRED: "합격입사",
  HOLD: "보류",
  REJECTED: "불합격",
  CANCELED: "지원취소",
};

const SOURCE_LABELS: Record<ApplicationSource, string> = {
  B2C_WEB: "B2C 지원",
  B2B_DIRECT: "직접 등록",
  HEADHUNTING: "헤드헌팅",
  REFERRAL: "추천",
};

const WINDOW_OPTIONS = [7, 30, 90, 180] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function metricCard(label: string, value: string, description: string) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div>
      <div className="mt-2 text-xs leading-relaxed text-slate-500">{description}</div>
    </div>
  );
}

export default function RecruitingAnalyticsPage() {
  const router = useRouter();
  const session = useB2BSession();
  const [days, setDays] = useState<number>(30);
  const [organizations, setOrganizations] = useState<B2BOrganizationView[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    session.role === "RECRUITER" ? session.organizationId || "" : ""
  );
  const [analytics, setAnalytics] = useState<RecruitingAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session.role !== "ADMIN") {
      setSelectedOrganizationId(session.organizationId || "");
      setOrganizations([]);
      return;
    }

    let cancelled = false;

    fetchB2BOrganizations()
      .then((items) => {
        if (!cancelled) {
          setOrganizations(items.filter((item) => item.status !== "INACTIVE"));
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Analytics organization list failed:", error);
        toast.error(
          error instanceof OrganizationApiError
            ? error.message
            : "분석 조직 목록을 불러오지 못했습니다."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [session.organizationId, session.role]);

  const loadAnalytics = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const organizationId =
          session.role === "RECRUITER"
            ? session.organizationId
            : selectedOrganizationId || undefined;

        setAnalytics(
          await fetchRecruitingAnalytics(days, organizationId)
        );
      } catch (error) {
        console.error("Recruiting analytics fetch failed:", error);

        if (error instanceof AnalyticsApiError && error.status === 401) {
          toast.error("관리자 로그인 세션이 만료되었습니다.");
          router.replace("/b2b-admin/login");
          return;
        }

        if (!silent) {
          toast.error(
            error instanceof AnalyticsApiError
              ? error.message
              : "채용 분석 데이터를 불러오지 못했습니다."
          );
        }
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    }, [days, router, selectedOrganizationId, session.organizationId, session.role]
  );

  useEffect(() => {
    void loadAnalytics(false);
  }, [loadAnalytics]);

  const maxDailyCount = useMemo(() => {
    if (!analytics) return 1;
    return Math.max(1, ...analytics.dailyApplications.map((item) => item.count));
  }, [analytics]);

  const maxStageCount = useMemo(() => {
    if (!analytics) return 1;
    return Math.max(1, ...analytics.stageCounts.map((item) => item.count));
  }, [analytics]);

  const selectedOrganizationName = useMemo(() => {
    if (session.role === "RECRUITER") {
      return organizations.find((item) => item.organizationId === session.organizationId)?.name || session.organizationId || "내 조직";
    }

    if (!selectedOrganizationId) return "J&C 전체";
    return organizations.find((item) => item.organizationId === selectedOrganizationId)?.name || selectedOrganizationId;
  }, [organizations, selectedOrganizationId, session.organizationId, session.role]);

  if (loading) {
    return (
      <div className="py-24 text-center text-sm font-medium text-slate-400">
        채용 분석 데이터를 계산하고 있습니다...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="text-sm font-semibold text-slate-700">분석 데이터를 불러오지 못했습니다.</div>
        <button type="button" onClick={() => void loadAnalytics(false)} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">다시 시도</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Recruiting Analytics</div>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">채용 운영 분석</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            최근 기간의 퍼널, 채용 속도, 지연 지원 건과 공고별 성과를 서버 권한 기준으로 확인합니다.
          </p>
          <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            분석 범위 · {selectedOrganizationName}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session.role === "ADMIN" ? (
            <select
              value={selectedOrganizationId}
              onChange={(event) => setSelectedOrganizationId(event.target.value)}
              className="max-w-[260px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <option value="">J&C 전체 조직</option>
              {organizations.map((organization) => (
                <option key={organization.organizationId} value={organization.organizationId}>
                  {organization.name}
                </option>
              ))}
            </select>
          ) : null}

          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {WINDOW_OPTIONS.map((value) => (
              <option key={value} value={value}>최근 {value}일</option>
            ))}
          </select>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadAnalytics(true)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {refreshing ? "갱신 중..." : "새로고침"}
          </button>
        </div>
      </div>

      {analytics.truncated ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          분석 대상이 5,000건을 초과해 최신 5,000건까지만 계산했습니다. 장기 누적 분석은 집계 스냅샷으로 전환하는 것이 권장됩니다.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCard("지원", formatNumber(analytics.totalApplications), `최근 ${analytics.windowDays}일 신규 지원`)}
        {metricCard("활성 파이프라인", formatNumber(analytics.activeApplications), "최종 결과가 확정되지 않은 진행 건")}
        {metricCard("채용", formatNumber(analytics.hired), `기간 내 지원 대비 ${analytics.hireRate}%`)}
        {metricCard("평균 의사결정", analytics.averageDecisionDays === null ? "-" : `${analytics.averageDecisionDays}일`, "Hiring Outcome이 기록된 건의 지원→결정 평균")}
        {metricCard("면접 이상 도달", formatNumber(analytics.interviewOrLater), `현재 단계 기준 ${analytics.interviewOrLaterRate}%`)}
        {metricCard("처우협의", formatNumber(analytics.offers), "현재 OFFER 단계")}
        {metricCard("주의 필요", formatNumber(analytics.attentionApplications), "NEW 또는 REVIEWING 단계")}
        {metricCard("3일 이상 정체", formatNumber(analytics.staleApplications), "활성 파이프라인 중 최근 활동 3일 이상 경과")}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">채용 퍼널</h2>
          <p className="mt-1 text-xs text-slate-400">현재 Application stage 분포</p>
          <div className="mt-6 space-y-3">
            {analytics.stageCounts.map((item) => {
              const width = item.count === 0 ? 0 : Math.max(4, Math.round((item.count / maxStageCount) * 100));
              return (
                <div key={item.stage}>
                  <div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">{STAGE_LABELS[item.stage]}</span><span className="font-bold text-slate-900">{formatNumber(item.count)}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{ width: `${width}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">유입 경로</h2>
          <p className="mt-1 text-xs text-slate-400">지원 source 기준 분포</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {analytics.sourceCounts.map((item) => (
              <div key={item.source} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-500">{SOURCE_LABELS[item.source]}</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900">{formatNumber(item.count)}</div>
              </div>
            ))}
          </div>
          <div className="mt-7 border-t border-slate-100 pt-5"><div className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-600">불합격</span><span className="font-bold text-slate-900">{formatNumber(analytics.rejected)}</span></div></div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-lg font-bold text-slate-900">일별 지원 추이</h2><p className="mt-1 text-xs text-slate-400">지원일 기준 신규 Application</p></div>
          <div className="text-xs text-slate-400">{analytics.dailyApplications.length}개 활성 일자</div>
        </div>
        {analytics.dailyApplications.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">선택한 기간에 지원 데이터가 없습니다.</div>
        ) : (
          <div className="mt-6 flex min-h-48 items-end gap-1 overflow-x-auto border-b border-slate-100 pb-2">
            {analytics.dailyApplications.map((item) => {
              const height = Math.max(8, Math.round((item.count / maxDailyCount) * 160));
              return (
                <div key={item.date} className="group flex min-w-7 flex-1 flex-col items-center justify-end gap-2" title={`${item.date}: ${item.count}건`}>
                  <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100">{item.count}</div>
                  <div className="w-full max-w-8 rounded-t bg-brand-gold" style={{ height: `${height}px` }} />
                  <div className="text-[10px] text-slate-400">{item.date.slice(5)}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6"><h2 className="text-lg font-bold text-slate-900">공고별 성과 Top 10</h2><p className="mt-1 text-xs text-slate-400">기간 내 지원 건수 기준</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="px-6 py-3 text-left">공고</th><th className="px-4 py-3 text-right">지원</th><th className="px-4 py-3 text-right">활성</th><th className="px-6 py-3 text-right">채용</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.topJobs.map((job) => (
                <tr key={job.jobId}><td className="px-6 py-4"><div className="font-bold text-slate-900">{job.jobTitle}</div><div className="mt-0.5 text-xs text-slate-400">{job.company}</div></td><td className="px-4 py-4 text-right font-semibold text-slate-700">{formatNumber(job.applications)}</td><td className="px-4 py-4 text-right font-semibold text-slate-700">{formatNumber(job.active)}</td><td className="px-6 py-4 text-right font-bold text-slate-900">{formatNumber(job.hired)}</td></tr>
              ))}
              {analytics.topJobs.length === 0 ? <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">표시할 공고 데이터가 없습니다.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="text-right text-[11px] text-slate-400">마지막 계산: {new Date(analytics.generatedAt).toLocaleString("ko-KR")}</div>
    </div>
  );
}
