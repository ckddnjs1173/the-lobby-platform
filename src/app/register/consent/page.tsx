"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RegistrationConsentPage() {
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const continueRegistration = async () => {
    if (!privacyConsent || !termsConsent || submitting) return;
    setSubmitting(true);

    try {
      const response = await fetch("/api/public/registration-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyConsent: true, termsConsent: true }),
      });

      const payload = await response.json().catch(() => null) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "동의 정보를 저장하지 못했습니다.");
      }

      window.location.assign("/register");
    } catch (error) {
      console.error("Registration consent failed:", error);
      toast.error(error instanceof Error ? error.message : "동의 처리 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-light px-5 py-16 text-brand-ink sm:px-8">
      <section className="mx-auto max-w-3xl rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-9">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-bronze">Candidate Registration</p>
        <h1 className="font-editorial mt-3 text-[36px] tracking-[-0.04em] text-brand-espresso">프로필 등록 전 확인해주세요</h1>
        <p className="mt-3 text-sm leading-7 text-brand-muted">
          The Lobby Candidate 프로필 생성과 채용 지원 처리를 위해 아래 필수 동의를 확인합니다. 인재풀 공개 여부와 새 공고 알림은 가입 후 별도 설정할 수 있습니다.
        </p>

        <div className="mt-7 space-y-4">
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-5 ${privacyConsent ? "border-brand-gold bg-brand-ivory" : "border-brand-line bg-white"}`}>
            <input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1" />
            <span>
              <span className="block text-sm font-bold text-brand-espresso">[필수] 개인정보 수집·이용 동의</span>
              <span className="mt-2 block text-xs leading-6 text-brand-muted">
                목적: Candidate 계정·프로필 생성, 채용공고 지원 및 전형 진행 관리. 항목: 이름, 이메일, 연락처, 경력, 학력, 스킬 및 사용자가 등록하는 프로필 정보. 보유기간: 회원 탈퇴·삭제 요청 또는 서비스 이용 목적 달성 시까지이며, 법령상 별도 보존 의무가 있는 경우 해당 기간 동안 보관할 수 있습니다. 동의를 거부할 수 있으나 필수 정보 처리에 동의하지 않으면 Candidate 프로필을 생성할 수 없습니다.
              </span>
              <Link href="/privacy" target="_blank" className="mt-3 inline-flex text-xs font-bold text-brand-bronze underline">개인정보 처리방침 전체 보기</Link>
            </span>
          </label>

          <label className={`flex cursor-pointer gap-3 rounded-xl border p-5 ${termsConsent ? "border-brand-gold bg-brand-ivory" : "border-brand-line bg-white"}`}>
            <input type="checkbox" checked={termsConsent} onChange={(event) => setTermsConsent(event.target.checked)} className="mt-1" />
            <span>
              <span className="block text-sm font-bold text-brand-espresso">[필수] The Lobby 이용약관 동의</span>
              <span className="mt-2 block text-xs leading-6 text-brand-muted">계정 이용, 채용공고 지원, 서비스 운영 및 이용자 의무에 관한 기본 조건을 확인합니다.</span>
              <Link href="/terms" target="_blank" className="mt-3 inline-flex text-xs font-bold text-brand-bronze underline">이용약관 전체 보기</Link>
            </span>
          </label>
        </div>

        <div className="mt-7 rounded-xl border border-brand-line bg-brand-light p-4 text-xs leading-6 text-brand-muted">
          <strong className="text-brand-espresso">별도 선택사항</strong><br />
          J&C 공개 인재풀 등록 및 새 공고 알림 수신은 이 필수 가입 동의에 포함되지 않습니다. 프로필 생성 후 인재풀 설정에서 각각 선택할 수 있습니다.
        </div>

        <button
          type="button"
          onClick={() => void continueRegistration()}
          disabled={!privacyConsent || !termsConsent || submitting}
          className="mt-7 w-full rounded-lg bg-brand-bronze px-5 py-3.5 text-sm font-bold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-35"
        >
          {submitting ? "동의 처리 중..." : "동의하고 프로필 등록 계속"}
        </button>
        <Link href="/" className="mt-4 block text-center text-xs font-bold text-brand-muted">취소하고 홈으로</Link>
      </section>
    </main>
  );
}
