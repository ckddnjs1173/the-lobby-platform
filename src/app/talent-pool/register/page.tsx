"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { rememberCandidateReturnPath } from "../../../lib/candidateNavigationIntent";

export default function TalentPoolRegistrationEntryPage() {
  const router = useRouter();

  useEffect(() => {
    rememberCandidateReturnPath("/talent-pool/settings");
    router.replace("/register");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-light px-5 text-center">
      <div className="rounded-xl border border-brand-line bg-white px-8 py-7 shadow-card">
        <p className="font-editorial text-2xl text-brand-espresso">인재풀 등록 준비 중</p>
        <p className="mt-2 text-xs text-brand-muted">필수 동의와 Candidate 프로필 등록 화면으로 연결합니다.</p>
      </div>
    </main>
  );
}
