"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import CandidateHeader from "../../../components/candidate/CandidateHeader";
import {
  CandidatePreferenceApiError,
  fetchCandidatePreferences,
  updateCandidatePreferencesViaApi,
} from "../../../lib/candidatePreferenceApi";
import type {
  CandidatePreferencesInput,
  CandidatePreferencesView,
  JobSearchStatus,
} from "../../../lib/candidatePreferenceTypes";
import { auth } from "../../../lib/firebase";

const JOB_SEARCH_OPTIONS: Array<{ value: JobSearchStatus; label: string; description: string }> = [
  { value: "ACTIVE", label: "적극 구직 중", description: "조건이 맞는 포지션을 적극적으로 확인하고 있습니다." },
  { value: "OPEN", label: "좋은 제안이면 검토", description: "현재 상황과 무관하게 좋은 제안은 검토할 수 있습니다." },
  { value: "NOT_LOOKING", label: "현재 구직하지 않음", description: "프로필은 유지하되 신규 제안 대상에서는 우선 제외됩니다." },
];

function viewToForm(view: CandidatePreferencesView): CandidatePreferencesInput {
  return {
    desiredJob: view.desiredJob,
    desiredLocation: view.desiredLocation,
    desiredSalary: view.desiredSalary,
    desiredEmploymentType: view.desiredEmploymentType,
    jobSearchStatus: view.jobSearchStatus,
    availableFrom: view.availableFrom,
    talentPoolOptIn: view.talentPoolOptIn,
    jobAlertOptIn: view.jobAlertOptIn,
    privacyConsent: Boolean(view.consentVersion),
    termsConsent: Boolean(view.consentVersion),
  };
}

const EMPTY_FORM: CandidatePreferencesInput = {
  desiredJob: "",
  desiredLocation: "",
  desiredSalary: "",
  desiredEmploymentType: "",
  jobSearchStatus: "OPEN",
  availableFrom: "",
  talentPoolOptIn: false,
  jobAlertOptIn: false,
  privacyConsent: false,
  termsConsent: false,
};

export default function TalentPoolSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<CandidatePreferencesInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      try {
        const preferences = await fetchCandidatePreferences();
        setForm(viewToForm(preferences));
        setLastUpdatedAt(preferences.updatedAt);
      } catch (error) {
        console.error("Talent-pool settings load failed:", error);
        if (
          error instanceof CandidatePreferenceApiError &&
          (error.code === "CANDIDATE_NOT_FOUND" || error.status === 404)
        ) {
          router.replace("/register");
          return;
        }
        toast.error(
          error instanceof CandidatePreferenceApiError
            ? error.message
            : "인재풀 설정을 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const update = <K extends keyof CandidatePreferencesInput>(
    key: K,
    value: CandidatePreferencesInput[K]
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.privacyConsent || !form.termsConsent) {
      toast.error("개인정보 수집·이용 및 이용약관 동의가 필요합니다.");
      return;
    }

    setSaving(true);
    try {
      const saved = await updateCandidatePreferencesViaApi(form);
      setForm(viewToForm(saved));
      setLastUpdatedAt(saved.updatedAt);
      toast.success(
        saved.talentPoolOptIn
          ? "J&C 인재풀 공개 설정을 저장했습니다."
          : "인재풀 비공개 설정을 저장했습니다."
      );
    } catch (error) {
      console.error("Talent-pool settings save failed:", error);
      toast.error(
        error instanceof CandidatePreferenceApiError
          ? error.message
          : "인재풀 설정 저장 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="candidate-surface min-h-screen bg-brand-light">
        <CandidateHeader />
        <div className="flex min-h-[70vh] items-center justify-center pt-20 text-sm text-brand-muted">
          인재풀 설정을 불러오는 중입니다...
        </div>
      </div>
    );
  }

  return (
    <div className="candidate-surface min-h-screen bg-brand-light text-brand-ink">
      <CandidateHeader />
      <main className="mx-auto max-w-[1120px] px-5 pb-20 pt-28 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section className="rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-bronze">Talent Pool Profile</p>
            <h1 className="font-editorial mt-3 text-[36px] tracking-[-0.04em] text-brand-espresso sm:text-[42px]">어떤 기회를 찾고 있나요?</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
              희망 조건을 입력하면 J&C가 공개 인재풀 안에서 적합한 리셉션·프론트·VIP 서비스 포지션을 검토할 때 참고할 수 있습니다.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-xs font-bold text-brand-muted">
                희망 직무
                <input value={form.desiredJob} onChange={(event) => update("desiredJob", event.target.value)} placeholder="예: 기업 리셉션, VIP 라운지" className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-bronze" />
              </label>
              <label className="space-y-2 text-xs font-bold text-brand-muted">
                희망 지역
                <input value={form.desiredLocation} onChange={(event) => update("desiredLocation", event.target.value)} placeholder="예: 서울 강남·서초" className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-bronze" />
              </label>
              <label className="space-y-2 text-xs font-bold text-brand-muted">
                희망 급여
                <input value={form.desiredSalary} onChange={(event) => update("desiredSalary", event.target.value)} placeholder="예: 연 3,600만원 이상" className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-bronze" />
              </label>
              <label className="space-y-2 text-xs font-bold text-brand-muted">
                희망 고용형태
                <input value={form.desiredEmploymentType} onChange={(event) => update("desiredEmploymentType", event.target.value)} placeholder="예: 정규직, 계약직 협의" className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-bronze" />
              </label>
              <label className="space-y-2 text-xs font-bold text-brand-muted sm:col-span-2">
                입사 가능일
                <input value={form.availableFrom} onChange={(event) => update("availableFrom", event.target.value)} placeholder="예: 즉시, 2주 후, 2026-09-01" className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-bronze" />
              </label>
            </div>

            <div className="mt-8 border-t border-brand-line pt-7">
              <h2 className="text-sm font-bold text-brand-espresso">현재 구직 상태</h2>
              <div className="mt-4 grid gap-3">
                {JOB_SEARCH_OPTIONS.map((option) => (
                  <label key={option.value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${form.jobSearchStatus === option.value ? "border-brand-gold bg-brand-ivory" : "border-brand-line bg-white"}`}>
                    <input type="radio" name="jobSearchStatus" value={option.value} checked={form.jobSearchStatus === option.value} onChange={() => update("jobSearchStatus", option.value)} className="mt-1" />
                    <span><span className="block text-sm font-bold text-brand-espresso">{option.label}</span><span className="mt-1 block text-xs leading-5 text-brand-muted">{option.description}</span></span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-brand-line pt-7">
              <h2 className="text-sm font-bold text-brand-espresso">인재풀 공개 및 알림</h2>
              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer gap-3 rounded-xl border border-brand-line bg-brand-light p-4">
                  <input type="checkbox" checked={form.talentPoolOptIn} onChange={(event) => update("talentPoolOptIn", event.target.checked)} className="mt-1" />
                  <span><span className="block text-sm font-bold text-brand-espresso">J&C 인재풀에 프로필 공개</span><span className="mt-1 block text-xs leading-5 text-brand-muted">J&C 관리자만 인재풀에서 프로필과 연락처를 검색할 수 있습니다. 기업별 리쿠르터에게 자동 공개되지 않습니다.</span></span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-xl border border-brand-line bg-white p-4">
                  <input type="checkbox" checked={form.jobAlertOptIn} onChange={(event) => update("jobAlertOptIn", event.target.checked)} className="mt-1" />
                  <span><span className="block text-sm font-bold text-brand-espresso">새 공고 알림 수신 희망</span><span className="mt-1 block text-xs leading-5 text-brand-muted">수신 희망 여부를 저장합니다. 자동 알림 발송은 운영 채널이 활성화된 이후에만 시작됩니다.</span></span>
                </label>
              </div>
            </div>

            <div className="mt-8 border-t border-brand-line pt-7">
              <div className="space-y-3 text-xs leading-5 text-brand-muted">
                <label className="flex gap-3"><input type="checkbox" checked={form.privacyConsent} onChange={(event) => update("privacyConsent", event.target.checked)} className="mt-1" /><span><strong className="text-brand-espresso">[필수] 개인정보 수집·이용에 동의합니다.</strong> 채용 기회 검토, Candidate Portal 운영, 지원 및 인재풀 관리 목적에 사용됩니다. <Link href="/privacy" className="font-bold text-brand-bronze underline">개인정보 처리방침</Link></span></label>
                <label className="flex gap-3"><input type="checkbox" checked={form.termsConsent} onChange={(event) => update("termsConsent", event.target.checked)} className="mt-1" /><span><strong className="text-brand-espresso">[필수] 이용약관에 동의합니다.</strong> <Link href="/terms" className="font-bold text-brand-bronze underline">이용약관 보기</Link></span></label>
              </div>
            </div>

            <button type="button" onClick={() => void handleSave()} disabled={saving} className="mt-8 w-full rounded-lg bg-brand-bronze px-5 py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-espresso disabled:opacity-50">
              {saving ? "저장 중..." : "인재풀 설정 저장"}
            </button>
          </section>

          <aside className="space-y-5">
            <section className={`rounded-xl border p-5 shadow-card ${form.talentPoolOptIn ? "border-brand-gold/40 bg-brand-ivory" : "border-brand-line bg-white"}`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-bronze">Visibility</p>
              <p className="font-editorial mt-2 text-[27px] text-brand-espresso">{form.talentPoolOptIn ? "인재풀 공개" : "비공개"}</p>
              <p className="mt-2 text-xs leading-5 text-brand-muted">{form.talentPoolOptIn ? "J&C 관리자 검색 대상에 포함됩니다." : "일반 지원 기능은 그대로 사용할 수 있으며 J&C 공개 인재풀 검색에서는 제외됩니다."}</p>
              {lastUpdatedAt ? <p className="mt-4 text-[10px] text-brand-muted">최근 설정 · {new Date(lastUpdatedAt).toLocaleString("ko-KR")}</p> : null}
            </section>
            <section className="rounded-xl border border-brand-line bg-white p-5 text-xs leading-6 text-brand-muted shadow-card">
              <p className="font-bold text-brand-espresso">프로필 기본정보 수정</p>
              <p className="mt-2">경력·학력·스킬은 Candidate Portal에서 관리합니다.</p>
              <Link href="/candidate" className="mt-4 inline-flex font-bold text-brand-bronze">마이페이지로 이동 →</Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
