"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { rememberCandidateReturnPath } from "../../../lib/candidateNavigationIntent";

const STEPS = [
  ["01", "필수 동의"],
  ["02", "커리어 프로필"],
  ["03", "희망조건"],
  ["04", "인재풀 공개설정"],
] as const;

export default function TalentPoolRegistrationEntryPage() {
  const router = useRouter();

  useEffect(() => {
    rememberCandidateReturnPath("/talent-pool/settings");
    router.replace("/register");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-light px-5 text-center">
      <div className="w-full max-w-3xl rounded-2xl border border-brand-line bg-white px-6 py-8 shadow-card sm:px-9">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Talent Pool Registration</p>
        <h1 className="font-editorial mt-3 text-3xl text-brand-espresso">인재풀 등록을 시작합니다.</h1>
        <p className="mt-3 text-sm leading-6 text-brand-muted">필수 동의부터 프로필과 희망조건 설정까지 한 흐름으로 이어집니다.</p>
        <div className="mt-7 grid gap-2 sm:grid-cols-4">
          {STEPS.map(([number, label], index) => (
            <div key={number} className={`rounded-xl border px-3 py-4 text-left ${index === 0 ? "border-brand-gold bg-brand-ivory" : "border-brand-line bg-brand-light"}`}>
              <p className="font-editorial text-sm font-bold text-brand-bronze">{number}</p>
              <p className="mt-2 text-xs font-bold text-brand-espresso">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-brand-muted">잠시 후 필수 동의 및 Candidate 프로필 등록 화면으로 연결합니다.</p>
      </div>
    </main>
  );
}
