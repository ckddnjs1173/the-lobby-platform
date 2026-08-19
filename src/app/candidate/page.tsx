"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import CandidateHeader from "../../components/candidate/CandidateHeader";
import {
  CandidatePortalApiError,
  cancelCandidatePortalApplicationViaApi,
  fetchCandidatePortalApplications,
  fetchCandidatePortalProfile,
  updateCandidatePortalProfileViaApi,
} from "../../lib/candidatePortalApi";
import type {
  CandidatePortalApplicationView,
  CandidatePortalProfileView,
} from "../../lib/candidatePortalTypes";
import { auth } from "../../lib/firebase";
import type { ApplicationStage, CareerItem, EducationItem } from "../../types";

interface ProfileFormState {
  name: string;
  phone: string;
  headline: string;
  careerSummary: string;
  skills: string;
  careers: CareerItem[];
  education: EducationItem[];
}

const STAGE_COPY: Record<ApplicationStage, { label: string; description: string }> = {
  NEW: { label: "지원 접수", description: "지원서가 정상 접수되었습니다." },
  REVIEWING: { label: "검토 중", description: "담당자가 프로필을 검토하고 있습니다." },
  CONTACTED: { label: "연락 진행", description: "담당자 연락이 진행된 지원 건입니다." },
  RECOMMEND_PENDING: { label: "추천 준비", description: "고객사 추천을 준비하고 있습니다." },
  RECOMMENDED: { label: "기업 추천", description: "고객사에 프로필이 전달되었습니다." },
  DOCUMENT_SCREEN: { label: "서류 전형", description: "고객사 서류 검토가 진행 중입니다." },
  INTERVIEW: { label: "면접 진행", description: "면접 단계가 진행 중입니다." },
  OFFER: { label: "처우 협의", description: "최종 조건을 조율하고 있습니다." },
  HIRED: { label: "입사 확정", description: "채용이 확정되었습니다. 축하드립니다!" },
  HOLD: { label: "진행 보류", description: "채용 절차가 잠시 보류된 상태입니다." },
  REJECTED: { label: "전형 종료", description: "이번 채용 절차가 종료되었습니다." },
  CANCELED: { label: "지원 취소", description: "지원이 취소된 건입니다." },
};

const METHOD_LABELS = {
  ONSITE: "대면 면접",
  VIDEO: "화상 면접",
  PHONE: "전화 면접",
} as const;

const ACTIVE_STAGES = new Set<ApplicationStage>([
  "NEW",
  "REVIEWING",
  "CONTACTED",
  "RECOMMEND_PENDING",
  "RECOMMENDED",
  "DOCUMENT_SCREEN",
  "INTERVIEW",
  "OFFER",
]);

const CANCELABLE_STAGES = new Set<ApplicationStage>([
  ...ACTIVE_STAGES,
  "HOLD",
]);

function profileToForm(profile: CandidatePortalProfileView): ProfileFormState {
  return {
    name: profile.name,
    phone: profile.phone,
    headline: profile.headline,
    careerSummary: profile.careerSummary,
    skills: profile.skills.join(", "),
    careers: profile.careers,
    education: profile.education,
  };
}

function normalizeSkills(value: string): string[] {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusDot({ stage }: { stage: ApplicationStage }) {
  const terminal = stage === "REJECTED" || stage === "CANCELED";
  const hired = stage === "HIRED";
  return (
    <span
      className={`h-2 w-2 rounded-full ${
        terminal ? "bg-brand-danger" : hired ? "bg-brand-success" : "bg-brand-bronze"
      }`}
      aria-hidden="true"
    />
  );
}

export default function CandidatePortalPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidatePortalProfileView | null>(null);
  const [applications, setApplications] = useState<CandidatePortalApplicationView[]>([]);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cancelingApplicationId, setCancelingApplicationId] = useState<string | null>(null);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, applicationData] = await Promise.all([
        fetchCandidatePortalProfile(),
        fetchCandidatePortalApplications(),
      ]);
      setProfile(profileData);
      setForm(profileToForm(profileData));
      setApplications(applicationData);
    } catch (error) {
      console.error("Candidate portal load failed:", error);
      if (error instanceof CandidatePortalApiError && error.code === "CANDIDATE_NOT_FOUND") {
        router.replace("/register");
        return;
      }
      if (
        error instanceof CandidatePortalApiError &&
        (error.code === "AUTH_REQUIRED" || error.status === 401)
      ) {
        router.replace("/login");
        return;
      }
      toast.error(
        error instanceof CandidatePortalApiError
          ? error.message
          : "Candidate Portal을 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }
      void loadPortal();
    });
  }, [loadPortal, router]);

  const activeCount = useMemo(
    () => applications.filter((application) => ACTIVE_STAGES.has(application.stage)).length,
    [applications]
  );
  const interviewCount = useMemo(
    () => applications.filter((application) => application.stage === "INTERVIEW").length,
    [applications]
  );
  const hiredCount = useMemo(
    () => applications.filter((application) => application.stage === "HIRED").length,
    [applications]
  );
  const nextInterview = useMemo(
    () =>
      applications
        .map((application) => ({ application, interview: application.nextInterview }))
        .filter((item) => item.interview)
        .sort((a, b) =>
          new Date(a.interview!.scheduledAt).getTime() - new Date(b.interview!.scheduledAt).getTime()
        )[0] || null,
    [applications]
  );

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handlePortalNavigation = (index: number) => {
    if (index === 0) {
      scrollToSection("candidate-dashboard");
      return;
    }

    if (index === 1) {
      setEditing(true);
      window.requestAnimationFrame(() => scrollToSection("candidate-profile-editor"));
      return;
    }

    if (index === 2) {
      scrollToSection("candidate-applications");
      return;
    }

    scrollToSection("candidate-interviews");
  };

  const updateCareer = (index: number, field: keyof CareerItem, value: string) => {
    setForm((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        careers: previous.careers.map((career, careerIndex) =>
          careerIndex === index ? { ...career, [field]: value } : career
        ),
      };
    });
  };

  const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
    setForm((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        education: previous.education.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      };
    });
  };

  const handleSave = async () => {
    if (!form || saving) return;
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("이름과 연락처는 필수 입력 항목입니다.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCandidatePortalProfileViaApi({
        name: form.name.trim(),
        phone: form.phone.trim(),
        headline: form.headline.trim(),
        careerSummary: form.careerSummary.trim(),
        skills: normalizeSkills(form.skills),
        careers: form.careers,
        education: form.education,
      });
      setProfile(updated);
      setForm(profileToForm(updated));
      setEditing(false);
      toast.success("프로필을 업데이트했습니다.");
    } catch (error) {
      console.error("Candidate profile update failed:", error);
      toast.error(
        error instanceof CandidatePortalApiError
          ? error.message
          : "프로필 저장 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelApplication = async (application: CandidatePortalApplicationView) => {
    if (!CANCELABLE_STAGES.has(application.stage) || cancelingApplicationId) return;

    const confirmed = window.confirm(
      `${application.jobTitle} 지원을 취소하시겠습니까? 취소 후에는 같은 지원 건을 Candidate Portal에서 되돌릴 수 없습니다.`
    );

    if (!confirmed) return;

    setCancelingApplicationId(application.applicationId);

    try {
      const result = await cancelCandidatePortalApplicationViaApi(application.applicationId);
      setApplications((previous) =>
        previous.map((item) =>
          item.applicationId === application.applicationId
            ? { ...item, stage: result.stage, nextInterview: null }
            : item
        )
      );
      toast.success(result.changed ? "지원이 취소되었습니다." : "이미 취소된 지원입니다.");
    } catch (error) {
      console.error("Candidate application cancel failed:", error);
      toast.error(
        error instanceof CandidatePortalApiError
          ? error.message
          : "지원 취소 중 오류가 발생했습니다."
      );
    } finally {
      setCancelingApplicationId(null);
    }
  };

  if (loading) {
    return (
      <div className="candidate-surface min-h-screen bg-brand-light">
        <CandidateHeader />
        <div className="flex min-h-[70vh] items-center justify-center pt-20 text-sm font-medium text-brand-muted">
          내 커리어 정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (!profile || !form) {
    return (
      <div className="candidate-surface min-h-screen bg-brand-light">
        <CandidateHeader />
        <div className="mx-auto max-w-xl px-4 pb-12 pt-32 text-center text-sm text-brand-muted">
          Candidate 프로필을 확인할 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="candidate-surface min-h-screen bg-brand-light text-brand-ink">
      <CandidateHeader />

      <main id="candidate-dashboard" className="scroll-mt-24 mx-auto w-full max-w-[1480px] px-5 pb-16 pt-28 sm:px-8 lg:px-10">
        <div className="mb-6 flex items-center gap-2 text-[11px] text-brand-muted">
          <span>마이페이지</span><span>›</span><span className="font-bold text-brand-bronze">대시보드</span>
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[250px_minmax(0,1fr)_330px]">
          <aside className="min-w-0 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-bronze">My Career</p>
              <h1 className="font-editorial mt-2 text-[34px] text-brand-espresso">마이페이지</h1>
              <p className="mt-2 text-xs leading-5 text-brand-muted">지원부터 면접, 입사까지 내 커리어 진행을 확인합니다.</p>
            </div>

            <nav className="hidden overflow-hidden rounded-xl border border-brand-line bg-white shadow-card xl:block">
              {[
                ["대시보드", "현재 진행 현황"],
                ["내 프로필", `${profile.profileCompleteness}% 완성`],
                ["지원현황", `${applications.length}건`],
                ["면접", `${interviewCount}건 진행`],
              ].map(([label, caption], index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handlePortalNavigation(index)}
                  className={`flex w-full items-center justify-between border-b border-brand-line px-4 py-3.5 text-left last:border-b-0 ${index === 0 ? "bg-brand-ivory" : "hover:bg-brand-ivory/60"}`}
                >
                  <span className="text-xs font-bold text-brand-espresso">{label}</span>
                  <span className="text-[10px] text-brand-muted">{caption}</span>
                </button>
              ))}
            </nav>

            <div className="hidden rounded-xl border border-brand-line bg-brand-espresso p-5 text-white shadow-card xl:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-cream/60">Career Support</p>
              <p className="font-editorial mt-3 text-xl">새로운 기회를 계속 확인하세요.</p>
              <Link href="/jobs" className="mt-5 inline-flex rounded-lg border border-white/20 px-4 py-2.5 text-xs font-bold text-brand-cream hover:bg-white/10">
                추천 채용 보기 →
              </Link>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <section id="candidate-profile" className="scroll-mt-24 rounded-xl border border-brand-line bg-white p-5 shadow-card sm:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full sm:h-20 sm:w-20 bg-gradient-to-br from-brand-cream to-brand-ivory font-editorial text-3xl text-brand-bronze">
                    {profile.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-bronze">The Lobby Candidate</p>
                    <h2 className="font-editorial mt-1 truncate text-[24px] text-brand-espresso sm:text-[28px]">{profile.name}님, 환영합니다.</h2>
                    <p className="mt-1 truncate text-sm text-brand-muted">{profile.headline || "프로필 헤드라인을 등록해 나를 더 잘 보여주세요."}</p>
                    <div className="mt-3 grid min-w-0 gap-1 text-xs text-brand-muted sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-1">
                      <span>{profile.phone}</span><span className="min-w-0 break-all">{profile.email}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full border-l-0 border-brand-line md:w-auto md:min-w-[170px] md:border-l md:pl-6">
                  <div className="flex items-end justify-between">
                    <span className="text-[11px] font-bold text-brand-muted">프로필 완성도</span>
                    <span className="font-editorial text-3xl text-brand-espresso">{profile.profileCompleteness}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-cream">
                    <div className="h-full rounded-full bg-brand-bronze" style={{ width: `${profile.profileCompleteness}%` }} />
                  </div>
                  <button type="button" onClick={() => setEditing(true)} className="mt-3 text-xs font-bold text-brand-bronze">프로필 보완하기 →</button>
                </div>
              </div>
            </section>

            <section id="candidate-applications" className="scroll-mt-24 min-w-0 rounded-xl border border-brand-line bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-brand-espresso">지원현황</h2>
                  <p className="mt-1 text-[11px] text-brand-muted">현재 지원 건의 단계와 다음 액션을 확인하세요.</p>
                </div>
                <Link href="/jobs" className="text-xs font-bold text-brand-bronze">채용 더 보기 →</Link>
              </div>

              <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-xl border border-brand-line bg-brand-light">
                {[
                  ["전체 지원", applications.length],
                  ["진행 중", activeCount],
                  ["면접", interviewCount],
                  ["입사 확정", hiredCount],
                ].map(([label, value], index) => (
                  <div key={String(label)} className={`px-3 py-4 text-center ${index > 0 ? "border-l border-brand-line" : ""}`}>
                    <p className="text-[10px] font-bold text-brand-muted">{label}</p>
                    <p className="font-editorial mt-1 text-2xl text-brand-espresso">{value}</p>
                  </div>
                ))}
              </div>

              {applications.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-brand-line py-12 text-center">
                  <p className="text-sm font-semibold text-brand-muted">아직 지원한 채용공고가 없습니다.</p>
                  <Link href="/jobs" className="mt-4 inline-flex rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-bold text-white">채용공고 둘러보기</Link>
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-xl border border-brand-line">
                  <div className="hidden grid-cols-[minmax(0,1.6fr)_120px_110px] bg-brand-ivory px-4 py-3 text-[11px] font-bold text-brand-muted sm:grid">
                    <span>포지션 / 회사</span><span>지원일</span><span>진행상태</span>
                  </div>
                  {applications.map((application) => {
                    const copy = STAGE_COPY[application.stage];
                    const canCancel = CANCELABLE_STAGES.has(application.stage);
                    const canceling = cancelingApplicationId === application.applicationId;

                    return (
                      <article key={application.applicationId} className="grid gap-3 border-t border-brand-line px-4 py-4 first:border-t-0 sm:grid-cols-[minmax(0,1.6fr)_120px_110px] sm:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-brand-muted">{application.company}</p>
                          <Link href={`/jobs/${application.jobId}`} className="mt-1 block truncate text-sm font-bold text-brand-espresso hover:text-brand-bronze hover:underline">
                            {application.jobTitle}
                          </Link>
                          <p className="mt-1 text-[11px] text-brand-muted sm:hidden">지원일 {formatDate(application.appliedAt)}</p>
                        </div>
                        <div className="hidden text-xs text-brand-muted sm:block">{formatDate(application.appliedAt)}</div>
                        <div className="flex items-center gap-2">
                          <StatusDot stage={application.stage} />
                          <span className="text-xs font-bold text-brand-espresso">{copy.label}</span>
                        </div>
                        <div className="sm:col-span-3 -mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[11px] text-brand-muted">{copy.description}</p>
                          {canCancel ? (
                            <button
                              type="button"
                              onClick={() => void handleCancelApplication(application)}
                              disabled={cancelingApplicationId !== null}
                              className="w-fit text-[11px] font-bold text-brand-danger hover:underline disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {canceling ? "취소 처리 중..." : "지원 취소"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-5">
            <section id="candidate-interviews" className="scroll-mt-24 rounded-xl border border-brand-line bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-brand-espresso">다가오는 면접 일정</h2>
                <span className="text-[10px] text-brand-muted">NEXT</span>
              </div>
              {nextInterview?.interview ? (
                <div className="mt-4 rounded-xl border border-brand-line bg-brand-light p-4">
                  <p className="text-[11px] font-bold text-brand-bronze">{nextInterview.application.jobTitle}</p>
                  <p className="mt-2 text-sm font-bold text-brand-espresso">{formatDateTime(nextInterview.interview.scheduledAt)}</p>
                  <p className="mt-2 text-xs text-brand-muted">{METHOD_LABELS[nextInterview.interview.method]}</p>
                  {nextInterview.interview.location ? <p className="mt-1 break-all text-[11px] text-brand-muted">{nextInterview.interview.location}</p> : null}
                  {nextInterview.interview.interviewer ? <p className="mt-1 text-[11px] text-brand-muted">면접관 {nextInterview.interview.interviewer}</p> : null}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-brand-line px-4 py-8 text-center text-xs text-brand-muted">예정된 면접이 없습니다.</div>
              )}
            </section>

            <section className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-brand-espresso">내 프로필</h2>
                <button type="button" onClick={() => setEditing(true)} className="text-[11px] font-bold text-brand-bronze">수정</button>
              </div>
              <div className="mt-4 space-y-4 text-xs">
                <div><p className="font-bold text-brand-muted">경력 요약</p><p className="mt-1 line-clamp-4 leading-5 text-brand-ink">{profile.careerSummary || "경력 요약을 등록해주세요."}</p></div>
                <div><p className="font-bold text-brand-muted">핵심 스킬</p><div className="mt-2 flex flex-wrap gap-1.5">{profile.skills.length ? profile.skills.map((skill) => <span key={skill} className="rounded-full border border-brand-line bg-brand-ivory px-2 py-1 text-[11px] text-brand-muted">{skill}</span>) : <span className="text-brand-muted">등록된 스킬 없음</span>}</div></div>
                <div className="grid grid-cols-2 gap-3 border-t border-brand-line pt-4"><div><p className="text-brand-muted">경력</p><p className="mt-1 font-bold text-brand-espresso">{profile.careers.length}건</p></div><div><p className="text-brand-muted">학력</p><p className="mt-1 font-bold text-brand-espresso">{profile.education.length}건</p></div></div>
              </div>
            </section>
          </aside>
        </div>

        {editing ? (
          <section id="candidate-profile-editor" className="scroll-mt-24 mt-6 rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-col gap-4 border-b border-brand-line pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-bronze">Profile Editor</p><h2 className="font-editorial mt-2 text-[26px] text-brand-espresso">프로필 수정</h2></div>
              <div className="flex gap-2"><button type="button" onClick={() => { setForm(profileToForm(profile)); setEditing(false); }} className="rounded-lg border border-brand-line px-4 py-2.5 text-xs font-bold text-brand-muted">취소</button><button type="button" onClick={() => void handleSave()} disabled={saving} className="rounded-lg bg-brand-bronze px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "저장 중..." : "변경사항 저장"}</button></div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs font-bold text-brand-muted">이름<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-lg border border-brand-line px-3 py-2.5 text-sm font-normal text-brand-ink outline-none" /></label><label className="space-y-1 text-xs font-bold text-brand-muted">연락처<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full rounded-lg border border-brand-line px-3 py-2.5 text-sm font-normal text-brand-ink outline-none" /></label></div>
                <label className="block space-y-1 text-xs font-bold text-brand-muted">프로필 헤드라인<input value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} maxLength={200} className="w-full rounded-lg border border-brand-line px-3 py-2.5 text-sm font-normal text-brand-ink outline-none" /></label>
                <label className="block space-y-1 text-xs font-bold text-brand-muted">경력 요약<textarea value={form.careerSummary} onChange={(event) => setForm({ ...form, careerSummary: event.target.value })} maxLength={3000} className="min-h-32 w-full resize-y rounded-lg border border-brand-line px-3 py-2.5 text-sm font-normal leading-6 text-brand-ink outline-none" /></label>
                <label className="block space-y-1 text-xs font-bold text-brand-muted">핵심 스킬<input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="고객응대, VIP응대, 안내데스크" className="w-full rounded-lg border border-brand-line px-3 py-2.5 text-sm font-normal text-brand-ink outline-none" /></label>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-brand-espresso">경력</h3><button type="button" onClick={() => setForm({ ...form, careers: [...form.careers, { companyName: "", role: "", period: "", description: "" }] })} className="text-[11px] font-bold text-brand-bronze">+ 경력 추가</button></div>
                  <div className="mt-3 space-y-2">{form.careers.map((career, index) => <div key={`career-${index}`} className="rounded-lg border border-brand-line bg-brand-light p-3"><div className="grid gap-2 sm:grid-cols-2"><input value={career.companyName} onChange={(event) => updateCareer(index, "companyName", event.target.value)} placeholder="회사명" className="rounded-lg border border-brand-line px-3 py-2 text-xs" /><input value={career.role} onChange={(event) => updateCareer(index, "role", event.target.value)} placeholder="직무" className="rounded-lg border border-brand-line px-3 py-2 text-xs" /><input value={career.period} onChange={(event) => updateCareer(index, "period", event.target.value)} placeholder="기간" className="rounded-lg border border-brand-line px-3 py-2 text-xs" /></div><textarea value={career.description} onChange={(event) => updateCareer(index, "description", event.target.value)} placeholder="주요 업무" className="mt-2 min-h-16 w-full rounded-lg border border-brand-line px-3 py-2 text-xs" /><button type="button" onClick={() => setForm({ ...form, careers: form.careers.filter((_, itemIndex) => itemIndex !== index) })} className="mt-2 text-[11px] font-bold text-brand-danger">삭제</button></div>)}</div>
                </div>

                <div className="border-t border-brand-line pt-5">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-brand-espresso">학력</h3><button type="button" onClick={() => setForm({ ...form, education: [...form.education, { schoolName: "", major: "", degree: "", period: "" }] })} className="text-[11px] font-bold text-brand-bronze">+ 학력 추가</button></div>
                  <div className="mt-3 space-y-2">{form.education.map((item, index) => <div key={`education-${index}`} className="rounded-lg border border-brand-line bg-brand-light p-3"><div className="grid gap-2 sm:grid-cols-2"><input value={item.schoolName} onChange={(event) => updateEducation(index, "schoolName", event.target.value)} placeholder="학교명" className="rounded-lg border border-brand-line px-3 py-2 text-xs" /><input value={item.major || ""} onChange={(event) => updateEducation(index, "major", event.target.value)} placeholder="전공" className="rounded-lg border border-brand-line px-3 py-2 text-xs" /><input value={item.degree || ""} onChange={(event) => updateEducation(index, "degree", event.target.value)} placeholder="학위" className="rounded-lg border border-brand-line px-3 py-2 text-xs" /><input value={item.period || ""} onChange={(event) => updateEducation(index, "period", event.target.value)} placeholder="기간" className="rounded-lg border border-brand-line px-3 py-2 text-xs" /></div><button type="button" onClick={() => setForm({ ...form, education: form.education.filter((_, itemIndex) => itemIndex !== index) })} className="mt-2 text-[11px] font-bold text-brand-danger">삭제</button></div>)}</div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
