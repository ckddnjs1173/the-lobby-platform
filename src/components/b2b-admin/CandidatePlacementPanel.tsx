"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  CandidateCrmApiError,
  fetchCandidateCrmDetail,
  fetchCandidatePlacements,
  type CandidatePlacementItem,
} from "../../lib/candidateCrmApi";

import {
  CandidateWorkflowApiError,
  createDirectApplicationViaApi,
} from "../../lib/candidateWorkflowApi";

import {
  fetchB2BJobs,
  JobApiError,
  type B2BJobView,
} from "../../lib/jobApi";

interface CandidatePlacementPanelProps {
  candidateId: string;
}

function formatDateTime(
  value: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

export default function CandidatePlacementPanel({
  candidateId,
}: CandidatePlacementPanelProps) {
  const [organizationId, setOrganizationId] =
    useState("");
  const [placements, setPlacements] =
    useState<CandidatePlacementItem[]>([]);
  const [jobs, setJobs] =
    useState<B2BJobView[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [applyingJobId, setApplyingJobId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    Promise.all([
      fetchCandidateCrmDetail(candidateId),
      fetchCandidatePlacements(candidateId),
      fetchB2BJobs(),
    ])
      .then(([
        candidate,
        placementData,
        jobData,
      ]) => {
        if (cancelled) {
          return;
        }

        setOrganizationId(
          candidate.organizationId
        );
        setPlacements(placementData);
        setJobs(jobData);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Candidate placement data load failed:",
          error
        );

        if (
          error instanceof CandidateCrmApiError ||
          error instanceof JobApiError
        ) {
          toast.error(error.message);
        } else {
          toast.error(
            "후보자 지원 현황을 불러오지 못했습니다."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  const placementJobIds = useMemo(
    () =>
      new Set(
        placements.map(
          (placement) => placement.jobId
        )
      ),
    [placements]
  );

  const openJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.status === "OPEN" &&
          job.organizationId === organizationId
      ),
    [jobs, organizationId]
  );

  const handleCreatePlacement = async (
    jobId: string
  ) => {
    if (placementJobIds.has(jobId)) {
      toast.error(
        "이미 해당 공고에 등록된 후보자입니다."
      );
      return;
    }

    setApplyingJobId(jobId);

    try {
      await createDirectApplicationViaApi(
        candidateId,
        jobId
      );

      setPlacements(
        await fetchCandidatePlacements(
          candidateId
        )
      );

      toast.success(
        "기존 후보자를 공고에 투입했습니다."
      );
    } catch (error) {
      console.error(
        "Candidate placement create failed:",
        error
      );

      if (
        error instanceof CandidateWorkflowApiError
      ) {
        if (
          error.code === "DUPLICATE_APPLICATION"
        ) {
          try {
            setPlacements(
              await fetchCandidatePlacements(
                candidateId
              )
            );
          } catch {
            // duplicate response already communicates the result
          }
        }

        toast.error(error.message);
      } else {
        toast.error(
          "후보자를 공고에 투입하지 못했습니다."
        );
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            공고 재투입
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            같은 후보자를 여러 OPEN 공고에 독립적인 Application으로 등록할 수 있습니다.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          지원 이력 {placements.length}건 · OPEN 공고 {openJobs.length}건
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          지원 현황을 불러오는 중입니다...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600">
              현재 지원 이력
            </h3>

            {placements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-5 text-xs text-slate-400">
                아직 등록된 지원 건이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {placements.map((placement) => (
                  <div
                    key={placement.applicationId}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          {placement.jobTitle}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {placement.company}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                        {placement.stage}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-3">
                      {formatDateTime(placement.appliedAt)} · {placement.source}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600">
              투입 가능한 OPEN 공고
            </h3>

            {openJobs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-5 text-xs text-slate-400">
                현재 같은 조직에 OPEN 상태인 공고가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {openJobs.map((job) => {
                  const alreadyPlaced =
                    placementJobIds.has(job.jobId);
                  const applying =
                    applyingJobId === job.jobId;

                  return (
                    <div
                      key={job.jobId}
                      className="rounded-lg border border-slate-200 p-4 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">
                          {job.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 truncate">
                          {job.displayCompany || job.company} · {job.location}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={
                          alreadyPlaced ||
                          applyingJobId !== null
                        }
                        onClick={() =>
                          handleCreatePlacement(job.jobId)
                        }
                        className="shrink-0 px-3 py-2 rounded-lg bg-brand-navy text-brand-gold text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        {alreadyPlaced
                          ? "등록됨"
                          : applying
                            ? "투입 중..."
                            : "공고에 투입"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
