"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  ApplicationApiError,
  fetchB2BApplications,
  updateApplicationStageViaApi,
} from "../../lib/applicationApi";
import {
  ApplicationOperationsApiError,
  fetchAssignableRecruiters,
  type AssignableRecruiter,
} from "../../lib/applicationOperationsApi";
import {
  B2BApiError,
  fetchB2BCandidateProfile,
  type B2BCandidateProfile,
} from "../../lib/b2bApi";
import { useB2BSession } from "../../components/b2b-admin/B2BSessionContext";
import type { ApplicationStage, ApplicationView } from "../../types";
import ApplicationTable from "../../components/b2b-admin/ApplicationTable";
import ApplicationKanban from "../../components/b2b-admin/ApplicationKanban";
import ApplicationSlideOver from "../../components/b2b-admin/ApplicationSlideOver";

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

const ACTIVE_PIPELINE_STAGES = new Set<ApplicationStage>([
  "NEW",
  "REVIEWING",
  "CONTACTED",
  "RECOMMEND_PENDING",
  "RECOMMENDED",
  "DOCUMENT_SCREEN",
  "INTERVIEW",
  "OFFER",
]);

const TERMINAL_STAGES = new Set<ApplicationStage>([
  "HIRED",
  "HOLD",
  "REJECTED",
  "CANCELED",
]);

const STALE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;
const APPLICATION_REFRESH_INTERVAL_MS = 15 * 1000;

function getLastTouchTime(application: ApplicationView): number | null {
  for (const value of [
    application.lastActivityAt,
    application.updatedAt,
    application.appliedAt,
  ]) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function isStaleApplication(application: ApplicationView, now: number): boolean {
  if (TERMINAL_STAGES.has(application.stage)) return false;
  const lastTouchTime = getLastTouchTime(application);
  return lastTouchTime !== null && now - lastTouchTime >= STALE_THRESHOLD_MS;
}

function ViewIcon({ mode }: { mode: "TABLE" | "KANBAN" }) {
  if (mode === "TABLE") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M4 10h16M9 5v14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="4" y="5" width="5" height="14" rx="1.5" />
      <rect x="10" y="5" width="5" height="10" rx="1.5" />
      <rect x="16" y="5" width="4" height="7" rx="1.5" />
    </svg>
  );
}

export default function B2BAdminPage() {
  const router = useRouter();
  const session = useB2BSession();

  const [applications, setApplications] = useState<ApplicationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"TABLE" | "KANBAN">("TABLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<ApplicationStage | "ALL">("ALL");
  const [jobFilter, setJobFilter] = useState("ALL");
  const [recruiterFilter, setRecruiterFilter] = useState("ALL");
  const [activityFilter, setActivityFilter] = useState<"ALL" | "STALE">("ALL");
  const [recruiters, setRecruiters] = useState<AssignableRecruiter[]>([]);

  const [selectedApp, setSelectedApp] = useState<ApplicationView | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<B2BCandidateProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [otherApplications, setOtherApplications] = useState<ApplicationView[]>([]);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  const refreshApplications = useCallback(
    async ({ initial = false, silent = false }: { initial?: boolean; silent?: boolean } = {}) => {
      if (initial) setLoading(true);
      else setRefreshing(true);

      try {
        setApplications(await fetchB2BApplications());
      } catch (error) {
        console.error("B2B application list API error:", error);

        if (error instanceof ApplicationApiError) {
          if (error.status === 401) {
            if (!silent) toast.error("관리자 로그인 세션이 만료되었습니다.");
            router.replace("/b2b-admin/login");
            return;
          }
          if (!silent) toast.error(error.message);
        } else if (!silent) {
          toast.error("권한이 있는 지원 내역을 불러오지 못했습니다.");
        }

        if (initial) setApplications([]);
      } finally {
        if (initial) setLoading(false);
        else setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void refreshApplications({ initial: true });
    const intervalId = window.setInterval(
      () => void refreshApplications({ silent: true }),
      APPLICATION_REFRESH_INTERVAL_MS
    );
    return () => window.clearInterval(intervalId);
  }, [refreshApplications, session.role, session.organizationId]);

  useEffect(() => {
    setSearchQuery("");
    setStageFilter("ALL");
    setJobFilter("ALL");
    setRecruiterFilter("ALL");
    setActivityFilter("ALL");
  }, [session.role, session.organizationId]);

  const organizationKey = useMemo(() => {
    const ids = new Set<string>();
    if (session.organizationId?.trim()) ids.add(session.organizationId.trim());
    for (const application of applications) {
      if (application.organizationId.trim()) ids.add(application.organizationId.trim());
    }
    return Array.from(ids).sort().join("|");
  }, [applications, session.organizationId]);

  useEffect(() => {
    let cancelled = false;

    if (!organizationKey) {
      setRecruiters([]);
      return () => {
        cancelled = true;
      };
    }

    const organizationIds = organizationKey.split("|");

    void Promise.allSettled(
      organizationIds.map((organizationId) => fetchAssignableRecruiters(organizationId))
    ).then((results) => {
      if (cancelled) return;

      const recruiterMap = new Map<string, AssignableRecruiter>();
      let authExpired = false;

      for (const result of results) {
        if (result.status === "fulfilled") {
          for (const recruiter of result.value) recruiterMap.set(recruiter.uid, recruiter);
          continue;
        }

        if (
          result.reason instanceof ApplicationOperationsApiError &&
          result.reason.status === 401
        ) {
          authExpired = true;
        } else {
          console.error("Recruiter filter list error:", result.reason);
        }
      }

      if (authExpired) {
        toast.error("관리자 로그인 세션이 만료되었습니다.");
        router.replace("/b2b-admin/login");
        return;
      }

      setRecruiters(
        Array.from(recruiterMap.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"))
      );
    });

    return () => {
      cancelled = true;
    };
  }, [organizationKey, router]);

  const recruiterNameById = useMemo(() => {
    const result: Record<string, string> = {};
    for (const recruiter of recruiters) result[recruiter.uid] = recruiter.name;
    return result;
  }, [recruiters]);

  const jobOptions = useMemo(() => {
    const jobs = new Map<string, { jobId: string; label: string }>();
    for (const application of applications) {
      if (!jobs.has(application.jobId)) {
        jobs.set(application.jobId, {
          jobId: application.jobId,
          label: `${application.jobTitle} · ${application.company}`,
        });
      }
    }
    return Array.from(jobs.values()).sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [applications]);

  const now = Date.now();

  const staleApplicationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const application of applications) {
      if (isStaleApplication(application, now)) ids.add(application.applicationId);
    }
    return ids;
  }, [applications, now]);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");

    return applications.filter((application) => {
      if (stageFilter !== "ALL" && application.stage !== stageFilter) return false;
      if (jobFilter !== "ALL" && application.jobId !== jobFilter) return false;
      if (recruiterFilter !== "ALL" && application.recruiterId !== recruiterFilter) return false;
      if (
        activityFilter === "STALE" &&
        !staleApplicationIds.has(application.applicationId)
      ) return false;
      if (!normalizedQuery) return true;

      return [
        application.candidateName,
        application.candidatePhone,
        application.candidateEmail,
        application.jobTitle,
        application.company,
        recruiterNameById[application.recruiterId] || "",
      ]
        .join(" ")
        .toLocaleLowerCase("ko-KR")
        .includes(normalizedQuery);
    });
  }, [
    activityFilter,
    applications,
    jobFilter,
    recruiterFilter,
    recruiterNameById,
    searchQuery,
    stageFilter,
    staleApplicationIds,
  ]);

  const activeCount = useMemo(
    () => applications.filter((application) => ACTIVE_PIPELINE_STAGES.has(application.stage)).length,
    [applications]
  );
  const attentionCount = useMemo(
    () => applications.filter((application) => application.stage === "NEW" || application.stage === "REVIEWING").length,
    [applications]
  );
  const interviewCount = useMemo(
    () => applications.filter((application) => application.stage === "INTERVIEW").length,
    [applications]
  );
  const hiredCount = useMemo(
    () => applications.filter((application) => application.stage === "HIRED").length,
    [applications]
  );
  const staleCount = staleApplicationIds.size;

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    stageFilter !== "ALL" ||
    jobFilter !== "ALL" ||
    recruiterFilter !== "ALL" ||
    activityFilter !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setStageFilter("ALL");
    setJobFilter("ALL");
    setRecruiterFilter("ALL");
    setActivityFilter("ALL");
  };

  const handleSelectApplication = async (application: ApplicationView) => {
    if (
      session.role === "RECRUITER" &&
      application.organizationId !== session.organizationId
    ) {
      toast.error("다른 조직의 지원 정보에는 접근할 수 없습니다.");
      return;
    }

    setSelectedApp(application);
    setIsSlideOverOpen(true);
    setCandidateProfile(null);
    setOtherApplications(
      applications.filter(
        (item) =>
          item.candidateId === application.candidateId &&
          item.applicationId !== application.applicationId
      )
    );
    setProfileLoading(true);

    try {
      setCandidateProfile(await fetchB2BCandidateProfile(application.applicationId));
    } catch (error) {
      console.error("Candidate profile API error:", error);
      setCandidateProfile(null);

      if (error instanceof B2BApiError) {
        if (error.status === 401) {
          toast.error("관리자 로그인 세션이 만료되었습니다.");
          router.replace("/b2b-admin/login");
          return;
        }
        toast.error(error.message);
        return;
      }
      toast.error("지원자의 상세 프로필을 불러오지 못했습니다.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleStageChange = async (
    applicationId: string,
    newStage: ApplicationStage,
    note?: string
  ) => {
    try {
      const result = await updateApplicationStageViaApi(applicationId, newStage, note);
      if (!result.changed) return;

      toast.success("지원 단계가 성공적으로 변경되었습니다.");
      setSelectedApp((previous) =>
        previous?.applicationId === applicationId
          ? { ...previous, stage: result.stage }
          : previous
      );
      setOtherApplications((previous) =>
        previous.map((application) =>
          application.applicationId === applicationId
            ? { ...application, stage: result.stage }
            : application
        )
      );
      await refreshApplications({ silent: true });
    } catch (error) {
      if (error instanceof ApplicationApiError) {
        if (error.status === 401) {
          toast.error("관리자 로그인 세션이 만료되었습니다.");
          router.replace("/b2b-admin/login");
          return;
        }
        toast.error(error.message);
        return;
      }
      console.error("Stage update error:", error);
      toast.error("지원 단계 변경 중 오류가 발생했습니다.");
    }
  };

  const handleCloseSlideOver = () => {
    setIsSlideOverOpen(false);
    setSelectedApp(null);
    setCandidateProfile(null);
    setProfileLoading(false);
    setOtherApplications([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-brand-line bg-white text-sm font-medium text-brand-muted shadow-card">
        서버 권한 기준으로 지원 내역을 불러오는 중입니다...
      </div>
    );
  }

  const metrics = [
    { label: "진행중", value: activeCount, caption: "Active pipeline" },
    { label: "신규 · 검토", value: attentionCount, caption: "Needs attention" },
    { label: "면접 진행", value: interviewCount, caption: "Interview" },
    { label: "합격 · 입사", value: hiredCount, caption: "Hired" },
    { label: "3일+ 미처리", value: staleCount, caption: "Stale", warning: staleCount > 0 },
  ];

  return (
    <div className="flex h-full flex-col gap-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-brand-line bg-white px-4 py-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-brand-muted">{metric.caption}</p>
                <p className="mt-1 text-[12px] font-bold text-brand-ink">{metric.label}</p>
              </div>
              {metric.warning ? <span className="mt-1 h-2 w-2 rounded-full bg-brand-danger" /> : null}
            </div>
            <p className={`font-editorial mt-4 text-[30px] ${metric.warning ? "text-brand-danger" : "text-brand-espresso"}`}>{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-brand-line bg-white p-4 shadow-card">
        <div className="flex flex-col justify-between gap-4 border-b border-brand-line pb-4 xl:flex-row xl:items-center">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand-bronze">Pipeline Controls</p>
            <p className="mt-1 text-xs text-brand-muted">
              총 <strong className="text-brand-espresso">{applications.length}건</strong> · 15초 자동 갱신
              {hasActiveFilters ? <> · 필터 결과 <strong className="text-brand-espresso">{filteredApplications.length}건</strong></> : null}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshApplications()}
              disabled={refreshing}
              className="rounded-lg border border-brand-line bg-white px-3 py-2.5 text-[10px] font-bold text-brand-muted transition hover:bg-brand-ivory hover:text-brand-bronze disabled:opacity-50"
            >
              {refreshing ? "갱신 중..." : "새로고침"}
            </button>

            <div className="flex rounded-lg border border-brand-line bg-brand-ivory p-1">
              {(["TABLE", "KANBAN"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-[10px] font-bold transition ${
                    viewMode === mode
                      ? "bg-white text-brand-bronze shadow-sm"
                      : "text-brand-muted hover:text-brand-ink"
                  }`}
                >
                  <ViewIcon mode={mode} />
                  {mode === "TABLE" ? "Table" : "Pipeline"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 xl:grid-cols-[minmax(240px,1.2fr)_160px_minmax(210px,1fr)_210px_160px_auto]">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="지원자, 연락처, 이메일, 공고, 기업, 담당자 검색"
            className="w-full rounded-lg border border-brand-line px-3.5 py-2.5 text-xs text-brand-ink outline-none transition focus:border-brand-bronze"
          />

          <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as ApplicationStage | "ALL")} className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-xs font-medium text-brand-ink outline-none focus:border-brand-bronze">
            <option value="ALL">모든 단계</option>
            {Object.entries(STAGE_LABELS).map(([stage, label]) => <option key={stage} value={stage}>{label}</option>)}
          </select>

          <select value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-xs font-medium text-brand-ink outline-none focus:border-brand-bronze">
            <option value="ALL">모든 공고</option>
            {jobOptions.map((job) => <option key={job.jobId} value={job.jobId}>{job.label}</option>)}
          </select>

          <select value={recruiterFilter} onChange={(event) => setRecruiterFilter(event.target.value)} className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-xs font-medium text-brand-ink outline-none focus:border-brand-bronze">
            <option value="ALL">모든 담당자</option>
            {recruiters.map((recruiter) => <option key={recruiter.uid} value={recruiter.uid}>{recruiter.name} · {recruiter.email}</option>)}
          </select>

          <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value as "ALL" | "STALE")} className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-xs font-medium text-brand-ink outline-none focus:border-brand-bronze">
            <option value="ALL">모든 처리상태</option>
            <option value="STALE">3일+ 미처리</option>
          </select>

          <button type="button" onClick={resetFilters} disabled={!hasActiveFilters} className="rounded-lg border border-brand-line px-3 py-2.5 text-[10px] font-bold text-brand-muted transition hover:bg-brand-ivory hover:text-brand-bronze disabled:opacity-35">초기화</button>
        </div>
      </section>

      <div className="min-h-[520px] flex-1">
        {viewMode === "TABLE" ? (
          <ApplicationTable
            applications={filteredApplications}
            recruiterNames={recruiterNameById}
            staleApplicationIds={staleApplicationIds}
            onSelectApplication={handleSelectApplication}
            onStageChange={(id, stage) => handleStageChange(id, stage)}
          />
        ) : (
          <ApplicationKanban
            applications={filteredApplications}
            recruiterNames={recruiterNameById}
            staleApplicationIds={staleApplicationIds}
            onStageChange={(id, stage) => handleStageChange(id, stage)}
            onSelectApplication={handleSelectApplication}
          />
        )}
      </div>

      <ApplicationSlideOver
        isOpen={isSlideOverOpen}
        onClose={handleCloseSlideOver}
        selectedApp={selectedApp}
        candidateProfile={candidateProfile}
        profileLoading={profileLoading}
        otherApplications={otherApplications}
        onStageChange={handleStageChange}
      />
    </div>
  );
}
