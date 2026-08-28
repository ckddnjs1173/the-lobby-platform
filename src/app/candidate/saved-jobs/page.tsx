"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import CandidateHeader from "../../../components/candidate/CandidateHeader";
import {
  CandidateSavedJobApiError,
  fetchCandidateSavedJobs,
  removeCandidateSavedJobViaApi,
  type CandidateSavedJobView,
} from "../../../lib/candidateSavedJobApi";
import { auth } from "../../../lib/firebase";
import {
  formatJobEmploymentType,
  formatJobLocation,
  formatJobSalary,
  getJobDisplayCompany,
} from "../../../lib/jobPresentation";
import { fetchPublicJobs } from "../../../lib/publicJobApi";
import type { PublicJobView } from "../../../lib/publicJobTypes";

export default function CandidateSavedJobsPage() {
  const router = useRouter();
  const [saved, setSaved] = useState<CandidateSavedJobView[]>([]);
  const [jobs, setJobs] = useState<PublicJobView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      setLoadError(null);
      try {
        const [savedItems, publicJobs] = await Promise.all([
          fetchCandidateSavedJobs(),
          fetchPublicJobs(),
        ]);
        setSaved(savedItems);
        setJobs(publicJobs);
      } catch (error) {
        console.error("Saved jobs load failed:", error);
        if (error instanceof CandidateSavedJobApiError && error.code === "CANDIDATE_NOT_FOUND") {
          router.replace("/register");
          return;
        }
        const message = error instanceof CandidateSavedJobApiError ? error.message : "저장공고를 불러오지 못했습니다.";
        setSaved([]);
        setJobs([]);
        setLoadError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    });
  }, [reloadKey, router]);

  const items = useMemo(() => {
    const jobsById = new Map(jobs.map((job) => [job.jobId, job]));
    return saved.map((item) => ({ saved: item, job: jobsById.get(item.jobId) || null }));
  }, [jobs, saved]);

  const handleRemove = async (jobId: string) => {
    if (workingId) return;
    setWorkingId(jobId);
    try {
      await removeCandidateSavedJobViaApi(jobId);
      setSaved((previous) => previous.filter((item) => item.jobId !== jobId));
      toast.success("저장공고에서 삭제했습니다.");
    } catch (error) {
      toast.error(error instanceof CandidateSavedJobApiError ? error.message : "저장공고 삭제에 실패했습니다.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="candidate-surface min-h-screen bg-brand-light text-brand-ink">
      <CandidateHeader />
      <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-28 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-bronze">Saved Jobs</p>
            <h1 className="font-editorial mt-2 text-[38px] text-brand-espresso">관심공고</h1>
            <p className="mt-2 text-sm text-brand-muted">지금 지원하지 않아도 관심 있는 포지션을 저장해 다시 확인할 수 있습니다.</p>
          </div>
          <Link href="/jobs" className="rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white">채용공고 더 보기</Link>
        </div>

        {loading ? (
          <div role="status" aria-live="polite" className="mt-7 rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">저장공고를 불러오는 중입니다...</div>
        ) : loadError ? (
          <section role="alert" className="mt-7 rounded-xl border border-brand-line bg-white px-6 py-16 text-center shadow-card">
            <p className="text-sm font-bold text-brand-espresso">관심공고를 불러오지 못했습니다.</p>
            <p className="mt-2 text-xs leading-5 text-brand-muted">{loadError}</p>
            <button type="button" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }} className="mt-5 rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white">다시 불러오기</button>
          </section>
        ) : items.length === 0 ? (
          <div className="mt-7 rounded-xl border border-dashed border-brand-line bg-white px-6 py-20 text-center shadow-card">
            <p className="text-sm font-bold text-brand-espresso">아직 저장한 공고가 없습니다.</p>
            <p className="mt-2 text-xs text-brand-muted">공고 상세에서 관심공고 저장 버튼을 눌러 다시 확인할 수 있습니다.</p>
          </div>
        ) : (
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {items.map(({ saved: item, job }) => (
              <article key={item.jobId} className="rounded-xl border border-brand-line bg-white p-5 shadow-card sm:p-6">
                {job ? (
                  <>
                    <p className="text-xs font-bold text-brand-bronze">{getJobDisplayCompany(job)}</p>
                    <Link href={`/jobs/${job.jobId}`} className="font-editorial mt-2 block text-[26px] leading-tight text-brand-espresso hover:text-brand-bronze">{job.title}</Link>
                    <div className="mt-4 grid gap-2 text-xs text-brand-muted sm:grid-cols-3">
                      <span>{formatJobLocation(job.location)}</span>
                      <span>{formatJobEmploymentType(job.employmentType)}</span>
                      <span>{formatJobSalary(job.salary)}</span>
                    </div>
                  </>
                ) : (
                  <><p className="text-sm font-bold text-brand-espresso">현재 마감된 공고입니다.</p><p className="mt-2 text-xs text-brand-muted">저장 기록은 직접 삭제할 때까지 유지됩니다.</p></>
                )}
                <div className="mt-5 flex justify-end border-t border-brand-line pt-4">
                  <button type="button" onClick={() => void handleRemove(item.jobId)} disabled={workingId !== null} className="rounded-lg border border-brand-line px-3 py-2 text-[11px] font-bold text-brand-muted disabled:opacity-45">{workingId === item.jobId ? "처리 중..." : "저장 삭제"}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
