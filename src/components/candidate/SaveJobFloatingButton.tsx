"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  CandidateSavedJobApiError,
  fetchCandidateSavedJobs,
  removeCandidateSavedJobViaApi,
  saveCandidateJobViaApi,
} from "../../lib/candidateSavedJobApi";
import { auth } from "../../lib/firebase";

export default function SaveJobFloatingButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setAuthenticated(Boolean(user));
      setAuthReady(true);
      if (!user) {
        setSaved(false);
        return;
      }

      try {
        const items = await fetchCandidateSavedJobs();
        setSaved(items.some((item) => item.jobId === jobId));
      } catch (error) {
        if (
          error instanceof CandidateSavedJobApiError &&
          error.code === "CANDIDATE_NOT_FOUND"
        ) {
          setSaved(false);
          return;
        }
        console.error("Saved-job restore failed:", error);
      }
    });
  }, [jobId]);

  const handleToggle = async () => {
    if (!authReady || working) return;
    if (!authenticated) {
      toast("로그인 후 관심공고를 저장할 수 있습니다.");
      router.push("/login");
      return;
    }

    setWorking(true);
    try {
      if (saved) {
        await removeCandidateSavedJobViaApi(jobId);
        setSaved(false);
        toast.success("저장공고에서 삭제했습니다.");
      } else {
        await saveCandidateJobViaApi(jobId);
        setSaved(true);
        toast.success("관심공고에 저장했습니다.");
      }
    } catch (error) {
      console.error("Saved-job toggle failed:", error);
      toast.error(
        error instanceof CandidateSavedJobApiError
          ? error.message
          : "관심공고 처리 중 오류가 발생했습니다."
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={working}
      aria-pressed={saved}
      className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border px-4 py-3 text-xs font-bold shadow-soft transition sm:bottom-7 sm:right-7 ${saved ? "border-brand-gold bg-brand-espresso text-brand-cream" : "border-brand-line bg-white text-brand-bronze hover:bg-brand-ivory"} disabled:opacity-55`}
    >
      <span aria-hidden="true">{saved ? "★" : "☆"}</span>
      {working ? "처리 중" : saved ? "저장됨" : "관심공고 저장"}
    </button>
  );
}
