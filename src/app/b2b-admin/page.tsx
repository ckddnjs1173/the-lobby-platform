"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import toast from "react-hot-toast";

import {
  db,
} from "../../lib/firebase";

import {
  ApplicationApiError,
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

import {
  useB2BSession,
} from "../../components/b2b-admin/B2BSessionContext";

import type {
  Application,
  ApplicationStage,
  ApplicationView,
} from "../../types";

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
  "REJECTED",
  "CANCELED",
]);

const STALE_THRESHOLD_MS =
  3 * 24 * 60 * 60 * 1000;

function toIsoString(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object" && value !== null) {
    const timestampLike = value as {
      toDate?: () => Date;
    };

    if (typeof timestampLike.toDate === "function") {
      try {
        return timestampLike.toDate().toISOString();
      } catch {
        return "";
      }
    }
  }

  return "";
}

function createApplicationView(
  application: Application,
  fallbackDocumentId: string
): ApplicationView {
  return {
    applicationId:
      application.applicationId || fallbackDocumentId,
    candidateId: application.candidateId,
    jobId: application.jobId,
    organizationId: application.organizationId,
    recruiterId: application.recruiterId,
    stage: application.stage,
    source: application.source,
    candidateName:
      application.candidateSnapshot?.name || "이름 없음",
    candidatePhone:
      application.candidateSnapshot?.phone || "-",
    candidateEmail:
      application.candidateSnapshot?.email || "-",
    jobTitle:
      application.jobSnapshot?.title || "공고명 없음",
    company:
      application.jobSnapshot?.company || "기업명 없음",
    appliedAt: toIsoString(application.appliedAt),
    updatedAt: toIsoString(application.updatedAt),
    lastActivityAt: toIsoString(application.lastActivityAt),
  };
}

function sortApplicationsByAppliedAt(
  applications: ApplicationView[]
): ApplicationView[] {
  return [...applications].sort((a, b) => {
    const aTime = Date.parse(a.appliedAt);
    const bTime = Date.parse(b.appliedAt);

    return (
      (Number.isNaN(bTime) ? 0 : bTime) -
      (Number.isNaN(aTime) ? 0 : aTime)
    );
  });
}

function getLastTouchTime(
  application: ApplicationView
): number | null {
  for (const value of [
    application.lastActivityAt,
    application.updatedAt,
    application.appliedAt,
  ]) {
    if (!value) {
      continue;
    }

    const parsed = Date.parse(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isStaleApplication(
  application: ApplicationView,
  now: number
): boolean {
  if (TERMINAL_STAGES.has(application.stage)) {
    return false;
  }

  const lastTouchTime = getLastTouchTime(application);

  return (
    lastTouchTime !== null &&
    now - lastTouchTime >= STALE_THRESHOLD_MS
  );
}

export default function B2BAdminPage() {
  const router = useRouter();
  const session = useB2BSession();

  const [applications, setApplications] =
    useState<ApplicationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] =
    useState<"TABLE" | "KANBAN">("TABLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] =
    useState<ApplicationStage | "ALL">("ALL");
  const [jobFilter, setJobFilter] = useState("ALL");
  const [recruiterFilter, setRecruiterFilter] =
    useState("ALL");
  const [activityFilter, setActivityFilter] =
    useState<"ALL" | "STALE">("ALL");
  const [recruiters, setRecruiters] =
    useState<AssignableRecruiter[]>([]);

  const [selectedApp, setSelectedApp] =
    useState<ApplicationView | null>(null);
  const [candidateProfile, setCandidateProfile] =
    useState<B2BCandidateProfile | null>(null);
  const [profileLoading, setProfileLoading] =
    useState(false);
  const [otherApplications, setOtherApplications] =
    useState<ApplicationView[]>([]);
  const [isSlideOverOpen, setIsSlideOverOpen] =
    useState(false);

  useEffect(() => {
    setLoading(true);

    const applicationsReference = collection(
      db,
      "applications"
    );

    const applicationsQuery =
      session.role === "ADMIN"
        ? query(applicationsReference)
        : query(
            applicationsReference,
            where(
              "organizationId",
              "==",
              session.organizationId
            )
          );

    const unsubscribe = onSnapshot(
      applicationsQuery,
      (snapshot) => {
        const views = snapshot.docs.map(
          (applicationDocument) =>
            createApplicationView(
              applicationDocument.data() as Application,
              applicationDocument.id
            )
        );

        setApplications(
          sortApplicationsByAppliedAt(views)
        );
        setLoading(false);
      },
      (error) => {
        console.error(
          "Application subscription error:",
          error
        );
        setApplications([]);
        setLoading(false);
        toast.error(
          "권한이 있는 지원 내역을 불러오지 못했습니다."
        );
      }
    );

    return unsubscribe;
  }, [session.role, session.organizationId]);

  useEffect(() => {
    setSearchQuery("");
    setStageFilter("ALL");
    setJobFilter("ALL");
    setRecruiterFilter("ALL");
    setActivityFilter("ALL");
  }, [session.role, session.organizationId]);

  const organizationKey = useMemo(() => {
    const ids = new Set<string>();

    if (session.organizationId?.trim()) {
      ids.add(session.organizationId.trim());
    }

    for (const application of applications) {
      if (application.organizationId.trim()) {
        ids.add(application.organizationId.trim());
      }
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
      organizationIds.map((organizationId) =>
        fetchAssignableRecruiters(organizationId)
      )
    ).then((results) => {
      if (cancelled) {
        return;
      }

      const recruiterMap = new Map<
        string,
        AssignableRecruiter
      >();

      let authExpired = false;

      for (const result of results) {
        if (result.status === "fulfilled") {
          for (const recruiter of result.value) {
            recruiterMap.set(recruiter.uid, recruiter);
          }
          continue;
        }

        if (
          result.reason instanceof
            ApplicationOperationsApiError &&
          result.reason.status === 401
        ) {
          authExpired = true;
        } else {
          console.error(
            "Recruiter filter list error:",
            result.reason
          );
        }
      }

      if (authExpired) {
        toast.error(
          "관리자 로그인 세션이 만료되었습니다."
        );
        router.replace("/b2b-admin/login");
        return;
      }

      setRecruiters(
        Array.from(recruiterMap.values()).sort(
          (a, b) =>
            a.name.localeCompare(b.name, "ko")
        )
      );
    });

    return () => {
      cancelled = true;
    };
  }, [organizationKey, router]);

  const recruiterNameById = useMemo(() => {
    const result: Record<string, string> = {};

    for (const recruiter of recruiters) {
      result[recruiter.uid] = recruiter.name;
    }

    return result;
  }, [recruiters]);

  const jobOptions = useMemo(() => {
    const jobs = new Map<
      string,
      { jobId: string; label: string }
    >();

    for (const application of applications) {
      if (!jobs.has(application.jobId)) {
        jobs.set(application.jobId, {
          jobId: application.jobId,
          label:
            `${application.jobTitle} · ${application.company}`,
        });
      }
    }

    return Array.from(jobs.values()).sort(
      (a, b) => a.label.localeCompare(b.label, "ko")
    );
  }, [applications]);

  const now = Date.now();

  const staleApplicationIds = useMemo(() => {
    const ids = new Set<string>();

    for (const application of applications) {
      if (isStaleApplication(application, now)) {
        ids.add(application.applicationId);
      }
    }

    return ids;
  }, [applications, now]);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = searchQuery
      .trim()
      .toLocaleLowerCase("ko-KR");

    return applications.filter((application) => {
      if (
        stageFilter !== "ALL" &&
        application.stage !== stageFilter
      ) {
        return false;
      }

      if (
        jobFilter !== "ALL" &&
        application.jobId !== jobFilter
      ) {
        return false;
      }

      if (
        recruiterFilter !== "ALL" &&
        application.recruiterId !== recruiterFilter
      ) {
        return false;
      }

      if (
        activityFilter === "STALE" &&
        !staleApplicationIds.has(
          application.applicationId
        )
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        application.candidateName,
        application.candidatePhone,
        application.candidateEmail,
        application.jobTitle,
        application.company,
        recruiterNameById[application.recruiterId] || "",
      ]
        .join(" ")
        .toLocaleLowerCase("ko-KR");

      return searchableText.includes(normalizedQuery);
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
    () =>
      applications.filter((application) =>
        ACTIVE_PIPELINE_STAGES.has(application.stage)
      ).length,
    [applications]
  );

  const attentionCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.stage === "NEW" ||
          application.stage === "REVIEWING"
      ).length,
    [applications]
  );

  const interviewCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.stage === "INTERVIEW"
      ).length,
    [applications]
  );

  const hiredCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.stage === "HIRED"
      ).length,
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

  const handleSelectApplication = async (
    application: ApplicationView
  ) => {
    if (
      session.role === "RECRUITER" &&
      application.organizationId !== session.organizationId
    ) {
      toast.error(
        "다른 조직의 지원 정보에는 접근할 수 없습니다."
      );
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
      setCandidateProfile(
        await fetchB2BCandidateProfile(
          application.applicationId
        )
      );
    } catch (error) {
      console.error(
        "Candidate profile API error:",
        error
      );
      setCandidateProfile(null);

      if (error instanceof B2BApiError) {
        if (error.status === 401) {
          toast.error(
            "관리자 로그인 세션이 만료되었습니다."
          );
          router.replace("/b2b-admin/login");
          return;
        }

        toast.error(error.message);
        return;
      }

      toast.error(
        "지원자의 상세 프로필을 불러오지 못했습니다."
      );
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
      const result = await updateApplicationStageViaApi(
        applicationId,
        newStage,
        note
      );

      if (!result.changed) {
        return;
      }

      toast.success(
        "지원 단계가 성공적으로 변경되었습니다."
      );

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
    } catch (error) {
      if (error instanceof ApplicationApiError) {
        if (error.status === 401) {
          toast.error(
            "관리자 로그인 세션이 만료되었습니다."
          );
          router.replace("/b2b-admin/login");
          return;
        }

        toast.error(error.message);
        return;
      }

      console.error("Stage update error:", error);
      toast.error(
        "지원 단계 변경 중 오류가 발생했습니다."
      );
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
      <div className="h-full min-h-[500px] flex items-center justify-center text-slate-400 font-medium">
        권한이 있는 지원 내역을 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              지원자 진행관리 Workspace
            </h1>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
              {session.role}
            </span>
          </div>

          <p className="text-sm text-slate-500 mt-1">
            총{" "}
            <span className="font-semibold text-brand-navy">
              {applications.length}건
            </span>
            의 지원 내역이 실시간 연동되어 있습니다.
            {hasActiveFilters && (
              <>
                {" "}현재 필터 결과{" "}
                <span className="font-semibold text-brand-navy">
                  {filteredApplications.length}건
                </span>
                입니다.
              </>
            )}
          </p>
        </div>

        <div className="bg-slate-200 p-1 rounded-xl flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode("TABLE")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === "TABLE"
                ? "bg-white text-brand-navy shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 테이블 뷰
          </button>
          <button
            type="button"
            onClick={() => setViewMode("KANBAN")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === "KANBAN"
                ? "bg-white text-brand-navy shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📊 칸반 보드 뷰
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["진행중", activeCount],
          ["신규 · 검토 필요", attentionCount],
          ["면접 진행", interviewCount],
          ["합격 · 입사", hiredCount],
          ["3일+ 미처리", staleCount],
        ].map(([label, count]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-[11px] font-bold text-slate-400">
              {label}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {count}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1.2fr)_170px_minmax(220px,1fr)_220px_170px_auto]">
          <input
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="지원자, 연락처, 이메일, 공고, 기업, 담당자 검색"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-navy"
          />

          <select
            value={stageFilter}
            onChange={(event) =>
              setStageFilter(
                event.target.value as
                  | ApplicationStage
                  | "ALL"
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-navy"
          >
            <option value="ALL">모든 단계</option>
            {Object.entries(STAGE_LABELS).map(
              ([stage, label]) => (
                <option key={stage} value={stage}>
                  {label}
                </option>
              )
            )}
          </select>

          <select
            value={jobFilter}
            onChange={(event) =>
              setJobFilter(event.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-navy"
          >
            <option value="ALL">모든 공고</option>
            {jobOptions.map((job) => (
              <option key={job.jobId} value={job.jobId}>
                {job.label}
              </option>
            ))}
          </select>

          <select
            value={recruiterFilter}
            onChange={(event) =>
              setRecruiterFilter(event.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-navy"
          >
            <option value="ALL">모든 담당자</option>
            {recruiters.map((recruiter) => (
              <option
                key={recruiter.uid}
                value={recruiter.uid}
              >
                {recruiter.name} · {recruiter.email}
              </option>
            ))}
          </select>

          <select
            value={activityFilter}
            onChange={(event) =>
              setActivityFilter(
                event.target.value as "ALL" | "STALE"
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-navy"
          >
            <option value="ALL">모든 처리 상태</option>
            <option value="STALE">3일+ 미처리만</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            필터 초기화
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[500px]">
        {viewMode === "TABLE" ? (
          <ApplicationTable
            applications={filteredApplications}
            recruiterNames={recruiterNameById}
            staleApplicationIds={staleApplicationIds}
            onSelectApplication={handleSelectApplication}
            onStageChange={(id, stage) =>
              handleStageChange(id, stage)
            }
          />
        ) : (
          <ApplicationKanban
            applications={filteredApplications}
            recruiterNames={recruiterNameById}
            staleApplicationIds={staleApplicationIds}
            onStageChange={(id, stage) =>
              handleStageChange(id, stage)
            }
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
