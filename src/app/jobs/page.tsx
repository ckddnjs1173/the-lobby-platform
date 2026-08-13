"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  useRouter,
} from "next/navigation";

import toast from "react-hot-toast";

import {
  auth,
  db,
} from "../../lib/firebase";

import {
  ApplicationApiError,
  applyToJob,
} from "../../lib/applicationApi";

import type {
  Job,
} from "../../types";

// ============================================================================
// Helpers
// ============================================================================

function getTimestampMillis(
  value: unknown
): number {
  if (!value) {
    return 0;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const timestampLike =
      value as {
        toMillis?: () => number;
      };

    if (
      typeof timestampLike.toMillis ===
      "function"
    ) {
      try {
        return timestampLike.toMillis();
      } catch {
        return 0;
      }
    }
  }

  return 0;
}

function sortJobsByCreatedAt(
  jobs: Job[]
): Job[] {
  return [
    ...jobs,
  ].sort((a, b) => {
    return (
      getTimestampMillis(
        b.createdAt
      ) -
      getTimestampMillis(
        a.createdAt
      )
    );
  });
}

// ============================================================================
// Component
// ============================================================================

export default function JobsPage() {
  const router =
    useRouter();

  const [
    jobs,
    setJobs,
  ] = useState<Job[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    applyingJobId,
    setApplyingJobId,
  ] = useState<
    string | null
  >(null);

  const [
    isAuthenticated,
    setIsAuthenticated,
  ] = useState(false);

  const [
    appliedJobIds,
    setAppliedJobIds,
  ] = useState<
    Set<string>
  >(
    () =>
      new Set()
  );

  // ==========================================================================
  // Auth
  // ==========================================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,

        (user) => {
          setIsAuthenticated(
            Boolean(user)
          );
        }
      );

    return unsubscribe;
  }, []);

  // ==========================================================================
  // Public OPEN Jobs
  // ==========================================================================

  useEffect(() => {
    /**
     * Security Rules는 Query 결과를 사후 필터링하지 않는다.
     *
     * 따라서 Public이 OPEN 공고만 읽을 수 있도록
     * Query 자체가 status == OPEN을 보장해야 한다.
     */
    const jobsQuery =
      query(
        collection(
          db,
          "jobs"
        ),

        where(
          "status",
          "==",
          "OPEN"
        )
      );

    const unsubscribe =
      onSnapshot(
        jobsQuery,

        (snapshot) => {
          const jobsData =
            snapshot.docs.map(
              (
                jobDocument
              ) => {
                return {
                  jobId:
                    jobDocument.id,

                  ...jobDocument.data(),
                } as Job;
              }
            );

          setJobs(
            sortJobsByCreatedAt(
              jobsData
            )
          );

          setLoading(false);
        },

        (error) => {
          console.error(
            "OPEN Job subscription error:",
            error
          );

          setJobs([]);

          setLoading(false);

          toast.error(
            "채용 공고를 불러오지 못했습니다."
          );
        }
      );

    return unsubscribe;
  }, []);

  // ==========================================================================
  // Apply
  // ==========================================================================

  const handleOneClickApply =
    async (
      jobId: string
    ) => {
      if (
        !isAuthenticated
      ) {
        toast.error(
          "프로필 등록 및 로그인이 필요합니다."
        );

        router.push(
          "/register"
        );

        return;
      }

      if (
        appliedJobIds.has(
          jobId
        )
      ) {
        toast(
          "이미 지원한 공고입니다."
        );

        return;
      }

      setApplyingJobId(
        jobId
      );

      try {
        const result =
          await applyToJob(
            jobId
          );

        setAppliedJobIds(
          (previous) => {
            const next =
              new Set(
                previous
              );

            next.add(
              jobId
            );

            return next;
          }
        );

        toast.success(
          "지원이 완료되었습니다! 헤드헌터가 확인 후 연락드립니다."
        );

        console.info(
          "Application created:",
          result.applicationId
        );
      } catch (error) {
        if (
          error instanceof
          ApplicationApiError
        ) {
          if (
            error.code ===
              "AUTH_REQUIRED" ||
            error.code ===
              "INVALID_ID_TOKEN" ||
            error.code ===
              "AUTH_TOKEN_MISSING"
          ) {
            toast.error(
              "로그인 세션을 다시 확인해주세요."
            );

            router.push(
              "/register"
            );

            return;
          }

          if (
            error.code ===
            "CANDIDATE_NOT_FOUND"
          ) {
            toast.error(
              "지원 전에 프로필 등록이 필요합니다."
            );

            router.push(
              "/register"
            );

            return;
          }

          if (
            error.code ===
            "DUPLICATE_APPLICATION"
          ) {
            setAppliedJobIds(
              (previous) => {
                const next =
                  new Set(
                    previous
                  );

                next.add(
                  jobId
                );

                return next;
              }
            );

            toast.error(
              "이미 지원한 공고입니다."
            );

            return;
          }

          toast.error(
            error.message
          );

          return;
        }

        console.error(
          "One-click apply error:",
          error
        );

        toast.error(
          "지원 처리 중 오류가 발생했습니다."
        );
      } finally {
        setApplyingJobId(
          null
        );
      }
    };

  // ==========================================================================
  // Loading
  // ==========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
        채용 공고를 불러오는
        중입니다...
      </div>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">
            The Lobby 엄선된 커리어 기회
          </h1>

          <p className="text-slate-500 text-sm">
            완성된 프로필로 간편하게 지원하고
            헤드헌터의 채용 지원을 받아보세요.
          </p>
        </div>

        <div className="grid gap-4 mt-8">
          {jobs.length >
          0 ? (
            jobs.map(
              (job) => {
                const isApplying =
                  applyingJobId ===
                  job.jobId;

                const isApplied =
                  appliedJobIds.has(
                    job.jobId
                  );

                const displayCompany =
                  job.displayCompany ||
                  job.company;

                return (
                  <div
                    key={
                      job.jobId
                    }
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-brand-gold/20 text-brand-navy text-xs font-bold rounded">
                          {
                            displayCompany
                          }
                        </span>

                        <span className="text-xs text-slate-400 font-mono">
                          {job.location ||
                            "근무지 협의"}
                          {" | "}
                          {job.salary ||
                            "급여 협의"}
                        </span>
                      </div>

                      <h2 className="text-lg font-bold text-slate-900">
                        {
                          job.title
                        }
                      </h2>

                      <p className="text-sm text-slate-600 line-clamp-2">
                        {
                          job.description
                        }
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleOneClickApply(
                          job.jobId
                        )
                      }
                      disabled={
                        isApplying ||
                        isApplied
                      }
                      className="w-full md:w-auto px-6 py-3 bg-brand-navy text-brand-gold text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isApplying
                        ? "지원 중..."
                        : isApplied
                          ? "지원 완료"
                          : "원클릭 지원"}
                    </button>
                  </div>
                );
              }
            )
          ) : (
            <div className="py-20 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
              현재 모집 중인 채용 공고가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}