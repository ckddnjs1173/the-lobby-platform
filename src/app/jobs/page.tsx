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

import CandidateHeader from "../../components/candidate/CandidateHeader";

import {
  CandidatePortalApiError,
  fetchCandidatePortalApplications,
} from "../../lib/candidatePortalApi";

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

function getTimestampMillis(
  value: unknown
): number {
  if (
    typeof value === "object" &&
    value !== null
  ) {
    const timestamp = value as {
      toMillis?: () => number;
    };

    if (
      typeof timestamp.toMillis === "function"
    ) {
      try {
        return timestamp.toMillis();
      } catch {
        return 0;
      }
    }
  }

  return 0;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] =
    useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);
  const [appliedJobIds, setAppliedJobIds] =
    useState<Set<string>>(() => new Set());

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      async (user) => {
        setIsAuthenticated(Boolean(user));

        if (!user) {
          setAppliedJobIds(new Set());
          return;
        }

        try {
          const applications =
            await fetchCandidatePortalApplications();

          setAppliedJobIds(
            new Set(
              applications.map(
                (application) =>
                  application.jobId
              )
            )
          );
        } catch (error) {
          if (
            error instanceof CandidatePortalApiError &&
            error.code === "CANDIDATE_NOT_FOUND"
          ) {
            setAppliedJobIds(new Set());
            return;
          }

          console.error(
            "Candidate application-state restore failed:",
            error
          );
        }
      }
    );
  }, []);

  useEffect(() => {
    const jobsQuery = query(
      collection(db, "jobs"),
      where("status", "==", "OPEN")
    );

    return onSnapshot(
      jobsQuery,
      (snapshot) => {
        const items = snapshot.docs
          .map((document) => ({
            jobId: document.id,
            ...document.data(),
          }) as Job)
          .sort(
            (a, b) =>
              getTimestampMillis(b.createdAt) -
              getTimestampMillis(a.createdAt)
          );

        setJobs(items);
        setLoading(false);
      },
      (error) => {
        console.error(
          "OPEN jobs subscription failed:",
          error
        );
        setJobs([]);
        setLoading(false);
        toast.error(
          "채용 공고를 불러오지 못했습니다."
        );
      }
    );
  }, []);

  const handleApply = async (
    jobId: string
  ) => {
    if (!isAuthenticated) {
      toast(
        "로그인 후 Candidate 프로필로 지원할 수 있습니다."
      );
      router.push("/login");
      return;
    }

    if (appliedJobIds.has(jobId)) {
      toast("이미 지원한 공고입니다.");
      return;
    }

    setApplyingJobId(jobId);

    try {
      await applyToJob(jobId);

      setAppliedJobIds((previous) => {
        const next = new Set(previous);
        next.add(jobId);
        return next;
      });

      toast.success(
        "지원이 완료되었습니다. 내 커리어에서 진행 상태를 확인할 수 있습니다."
      );
    } catch (error) {
      if (error instanceof ApplicationApiError) {
        if (
          error.code === "CANDIDATE_NOT_FOUND"
        ) {
          toast.error(
            "지원 전에 Candidate 프로필 등록을 완료해주세요."
          );
          router.push("/register");
          return;
        }

        if (
          error.code === "DUPLICATE_APPLICATION"
        ) {
          setAppliedJobIds((previous) => {
            const next = new Set(previous);
            next.add(jobId);
            return next;
          });
          toast("이미 지원한 공고입니다.");
          return;
        }

        if (
          error.status === 401 ||
          error.code === "AUTH_REQUIRED" ||
          error.code === "AUTH_TOKEN_MISSING" ||
          error.code === "INVALID_ID_TOKEN"
        ) {
          router.push("/login");
          return;
        }

        toast.error(error.message);
        return;
      }

      console.error(
        "Candidate apply failed:",
        error
      );
      toast.error(
        "지원 처리 중 오류가 발생했습니다."
      );
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <CandidateHeader />

      <main className="mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-24 sm:px-6">
        <section className="space-y-3 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
            Curated Opportunities
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            The Lobby 엄선된 커리어 기회
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-500">
            Candidate 프로필 하나로 간편하게 지원하고 내 커리어에서 진행 상태를 계속 확인하세요.
          </p>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => router.push("/candidate")}
              className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-brand-navy shadow-sm"
            >
              내 지원현황 보기
            </button>
          ) : null}
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center text-sm text-slate-400">
            채용 공고를 불러오는 중입니다...
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center text-sm text-slate-400">
            현재 모집 중인 채용 공고가 없습니다.
          </div>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => {
              const isApplying =
                applyingJobId === job.jobId;
              const isApplied =
                appliedJobIds.has(job.jobId);
              const displayCompany =
                job.displayCompany || job.company;

              return (
                <article
                  key={job.jobId}
                  className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-brand-gold/20 px-2.5 py-0.5 text-xs font-bold text-brand-navy">
                        {displayCompany}
                      </span>
                      <span className="text-xs text-slate-400">
                        {job.location || "근무지 협의"}
                        {" · "}
                        {job.employmentType || "고용형태 협의"}
                        {" · "}
                        {job.salary || "급여 협의"}
                      </span>
                    </div>

                    <h2 className="text-lg font-extrabold text-slate-900">
                      {job.title}
                    </h2>
                    <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                      {job.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleApply(job.jobId)
                    }
                    disabled={
                      isApplying || isApplied
                    }
                    className="w-full shrink-0 rounded-xl bg-brand-navy px-6 py-3 text-sm font-bold text-brand-gold hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                  >
                    {isApplying
                      ? "지원 중..."
                      : isApplied
                        ? "지원 완료"
                        : isAuthenticated
                          ? "원클릭 지원"
                          : "로그인 후 지원"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
