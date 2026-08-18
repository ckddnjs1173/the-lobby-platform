"use client";

import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import CandidateHeader from "../../components/candidate/CandidateHeader";
import {
  CandidatePortalApiError,
  bootstrapCandidateProfileViaApi,
  fetchCandidatePortalProfile,
} from "../../lib/candidatePortalApi";
import { auth } from "../../lib/firebase";
import type { CareerItem, EducationItem } from "../../types";

interface ResumeParseData {
  name: string;
  phone: string;
  email: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: EducationItem[];
}

interface ResumeParseResponse {
  success?: boolean;
  data?: ResumeParseData;
  error?: string;
}

interface RegistrationFormData {
  name: string;
  phone: string;
  email: string;
  password: string;
  headline: string;
  careerSummary: string;
  skills: string;
  careers: CareerItem[];
  education: EducationItem[];
}

interface FirebaseLikeError {
  code?: string;
}

function skillsToArray(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function calculateCompleteness(form: RegistrationFormData): number {
  let score = 0;
  if (form.name.trim()) score += 10;
  if (form.phone.trim()) score += 10;
  if (form.email.trim()) score += 10;
  if (form.headline.trim()) score += 10;
  if (form.careerSummary.trim()) score += 15;
  if (skillsToArray(form.skills).length > 0) score += 15;
  if (form.careers.length > 0) score += 20;
  if (form.education.length > 0) score += 10;
  return Math.min(score, 100);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold text-brand-ink">{children}</span>;
}

function StepItem({
  index,
  title,
  caption,
  active,
  complete,
}: {
  index: number;
  title: string;
  caption: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`font-editorial flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[13px] ${
          active || complete
            ? "border-brand-bronze bg-brand-bronze text-white"
            : "border-brand-line bg-white text-brand-muted"
        }`}
      >
        {index}
      </div>
      <div className="min-w-0">
        <p className={`truncate text-[11px] font-bold ${active ? "text-brand-bronze" : "text-brand-ink"}`}>{title}</p>
        <p className="mt-0.5 truncate text-[9px] text-brand-muted">{caption}</p>
      </div>
    </div>
  );
}

export default function RegisterProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState<"INPUT" | "PREVIEW">("INPUT");
  const [loading, setLoading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [hasAuthenticatedAccount, setHasAuthenticatedAccount] = useState(false);
  const [formData, setFormData] = useState<RegistrationFormData>({
    name: "",
    phone: "",
    email: "",
    password: "",
    headline: "",
    careerSummary: "",
    skills: "",
    careers: [],
    education: [],
  });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setHasAuthenticatedAccount(Boolean(user));

      if (!user) return;

      if (user.email) {
        setFormData((previous) => ({
          ...previous,
          email: user.email || previous.email,
          password: "",
        }));
      }

      try {
        await fetchCandidatePortalProfile();
        router.replace("/candidate");
      } catch (error) {
        if (
          error instanceof CandidatePortalApiError &&
          error.code === "CANDIDATE_NOT_FOUND"
        ) {
          setStep("PREVIEW");
        }
      }
    });
  }, [router]);

  const profileCompleteness = calculateCompleteness(formData);

  const updateField = (
    field:
      | "name"
      | "phone"
      | "email"
      | "password"
      | "headline"
      | "careerSummary"
      | "skills",
    value: string
  ) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const updateCareer = (index: number, field: keyof CareerItem, value: string) => {
    setFormData((previous) => ({
      ...previous,
      careers: previous.careers.map((career, careerIndex) =>
        careerIndex === index ? { ...career, [field]: value } : career
      ),
    }));
  };

  const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
    setFormData((previous) => ({
      ...previous,
      education: previous.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAiParse = async () => {
    const source = resumeText.trim();

    if (!source) {
      toast.error("분석할 이력서 텍스트를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/ai-parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: source }),
      });
      const result = (await response.json()) as ResumeParseResponse;

      if (!response.ok || !result.success || !result.data) {
        toast.error(result.error || "이력서 분석에 실패했습니다.");
        return;
      }

      const parsed = result.data;
      setFormData((previous) => ({
        ...previous,
        name: parsed.name || previous.name,
        phone: parsed.phone || previous.phone,
        email: auth.currentUser?.email || parsed.email || previous.email,
        headline: parsed.headline || "",
        careerSummary: parsed.careerSummary || "",
        skills: Array.isArray(parsed.skills) ? parsed.skills.join(", ") : "",
        careers: Array.isArray(parsed.careers) ? parsed.careers : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
      }));
      setStep("PREVIEW");
      toast.success("AI가 이력서를 구조화했습니다. 저장 전에 내용을 확인해주세요.");
    } catch (error) {
      console.error("Resume parse failed:", error);
      toast.error("이력서 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    const name = formData.name.trim();
    const phone = formData.phone.trim();
    const email = formData.email.trim().toLowerCase();

    if (!name || !phone || !email) {
      toast.error("이름, 연락처, 이메일은 필수 입력 항목입니다.");
      return;
    }

    if (!auth.currentUser && formData.password.length < 6) {
      toast.error("비밀번호는 최소 6자리 이상 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      if (!auth.currentUser) {
        await createUserWithEmailAndPassword(auth, email, formData.password);
      }

      const result = await bootstrapCandidateProfileViaApi({
        name,
        phone,
        headline: formData.headline.trim(),
        careerSummary: formData.careerSummary.trim(),
        skills: skillsToArray(formData.skills),
        careers: formData.careers,
        education: formData.education,
      });

      toast.success(
        result.created
          ? "Candidate 프로필이 생성되었습니다."
          : "기존 Candidate 프로필을 확인했습니다."
      );
      router.replace("/candidate");
    } catch (error) {
      console.error("Candidate registration failed:", error);
      const firebaseError = error as FirebaseLikeError;

      if (firebaseError.code === "auth/email-already-in-use") {
        toast.error("이미 가입된 이메일입니다. 로그인 후 이용해주세요.");
        router.push("/login");
        return;
      }
      if (firebaseError.code === "auth/weak-password") {
        toast.error("비밀번호는 최소 6자리 이상 입력해주세요.");
        return;
      }
      if (firebaseError.code === "auth/invalid-email") {
        toast.error("이메일 형식을 확인해주세요.");
        return;
      }
      if (error instanceof CandidatePortalApiError) {
        toast.error(
          `${error.message} 로그인 계정은 유지되므로 내용을 수정한 뒤 다시 저장할 수 있습니다.`
        );
        setHasAuthenticatedAccount(Boolean(auth.currentUser));
        return;
      }
      toast.error("프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="candidate-surface min-h-screen bg-brand-light">
      <CandidateHeader />

      <main className="mx-auto max-w-[1480px] px-5 pb-14 pt-28 sm:px-8 lg:px-10">
        <section className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-brand-bronze">Candidate Profile</p>
            <h1 className="font-editorial mt-3 text-[40px] tracking-[-0.045em] text-brand-espresso sm:text-[48px]">1분 프로필 등록</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
              기본정보를 입력하거나 기존 이력서 텍스트를 AI로 구조화해 빠르게 커리어 프로필을 완성하세요.
            </p>
          </div>

          <div className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-brand-muted">프로필 완성도</p>
                <p className="font-editorial mt-1 text-[32px] text-brand-espresso">{profileCompleteness}%</p>
              </div>
              <div className="relative h-16 w-16 rounded-full" style={{ background: `conic-gradient(#98642f ${profileCompleteness * 3.6}deg, #eee5da 0deg)` }}>
                <div className="absolute inset-[7px] rounded-full bg-white" />
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-brand-cream">
              <div className="h-full rounded-full bg-brand-bronze transition-all" style={{ width: `${profileCompleteness}%` }} />
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-3 rounded-xl border border-brand-line bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 lg:px-6">
          <StepItem index={1} title="기본정보" caption="계정·연락처" active={step === "PREVIEW"} complete={profileCompleteness >= 30} />
          <StepItem index={2} title="경력·학력" caption="커리어 입력" active={step === "PREVIEW"} complete={formData.careers.length > 0 || formData.education.length > 0} />
          <StepItem index={3} title="AI 구조화" caption="이력서 텍스트" active={step === "INPUT"} complete={step === "PREVIEW" && resumeText.trim().length > 0} />
          <StepItem index={4} title="검토·저장" caption="프로필 완성" active={step === "PREVIEW"} complete={profileCompleteness >= 80} />
        </section>

        {step === "INPUT" ? (
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-8">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-brand-bronze">AI Resume Intake</p>
              <h2 className="font-editorial mt-3 text-[28px] text-brand-espresso">이력서 텍스트 자동 구조화</h2>
              <p className="mt-2 text-xs leading-6 text-brand-muted">PDF/DOCX 파일 업로드 대신 현재는 기존 이력서의 텍스트를 붙여넣어 AI가 정보 구조화를 돕습니다.</p>

              <label className="mt-6 block space-y-2">
                <FieldLabel>기존 이력서 / 경력 기술서</FieldLabel>
                <textarea
                  value={resumeText}
                  onChange={(event) => setResumeText(event.target.value)}
                  placeholder="기존 이력서 내용을 붙여넣으세요."
                  className="h-[300px] w-full resize-y rounded-lg border border-brand-line bg-brand-light p-4 text-sm leading-6 outline-none transition focus:border-brand-bronze focus:bg-white"
                />
              </label>

              <div className="mt-4 rounded-lg border border-brand-line bg-brand-ivory/60 px-4 py-3 text-[10px] leading-5 text-brand-muted">
                입력한 이력서 원문은 프로필 구조화에만 사용되며 Firestore에 원문 자체를 저장하지 않습니다.
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleAiParse()}
                  disabled={loading}
                  className="rounded-lg bg-brand-bronze px-5 py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-espresso disabled:opacity-50"
                >
                  {loading ? "AI 분석 중..." : "AI로 자동 구조화"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("PREVIEW")}
                  className="rounded-lg border border-brand-line bg-white px-5 py-3.5 text-sm font-bold text-brand-bronze transition hover:bg-brand-ivory"
                >
                  직접 입력으로 계속
                </button>
              </div>
            </section>

            <aside className="rounded-xl border border-brand-line bg-brand-espresso p-7 text-white shadow-card sm:p-8">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-brand-cream/65">The Lobby Profile</p>
              <h2 className="font-editorial mt-4 text-[31px] leading-[1.4]">프로필 하나로 여러 포지션에 간편하게 지원하세요.</h2>
              <div className="mt-8 space-y-5 text-sm text-white/72">
                <div className="border-t border-white/15 pt-4"><strong className="block text-white">01 · 기본정보</strong><span className="mt-1 block text-xs">이름, 연락처와 로그인 계정을 연결합니다.</span></div>
                <div className="border-t border-white/15 pt-4"><strong className="block text-white">02 · 경력과 스킬</strong><span className="mt-1 block text-xs">리셉션·고객서비스 경험을 구조화합니다.</span></div>
                <div className="border-t border-white/15 pt-4"><strong className="block text-white">03 · 지원현황 연동</strong><span className="mt-1 block text-xs">지원 이후 진행 상태와 면접 일정을 계속 확인합니다.</span></div>
              </div>
              <p className="mt-10 text-xs text-white/55">이미 가입했다면 <Link href="/login" className="font-bold text-brand-cream underline underline-offset-4">로그인</Link></p>
            </aside>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_390px]">
            <section className="rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-8">
              <div className="flex flex-col justify-between gap-4 border-b border-brand-line pb-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Profile Information</p>
                  <h2 className="font-editorial mt-2 text-[27px] text-brand-espresso">프로필 정보 입력</h2>
                </div>
                {hasAuthenticatedAccount ? (
                  <span className="rounded-full border border-brand-success/25 bg-brand-success/10 px-3 py-1.5 text-[10px] font-bold text-brand-success">로그인 계정 연결됨</span>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2"><FieldLabel>이름 *</FieldLabel><input value={formData.name} onChange={(event) => updateField("name", event.target.value)} className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze" /></label>
                <label className="space-y-2"><FieldLabel>연락처 *</FieldLabel><input value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze" /></label>
                <label className="space-y-2"><FieldLabel>이메일 *</FieldLabel><input type="email" value={formData.email} disabled={hasAuthenticatedAccount} onChange={(event) => updateField("email", event.target.value)} className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze disabled:bg-brand-ivory" /></label>
                {!hasAuthenticatedAccount ? (
                  <label className="space-y-2"><FieldLabel>비밀번호 *</FieldLabel><input type="password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} autoComplete="new-password" className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze" /></label>
                ) : <div />}
              </div>

              <div className="mt-5 grid gap-4">
                <label className="space-y-2"><FieldLabel>프로필 헤드라인</FieldLabel><input value={formData.headline} maxLength={200} onChange={(event) => updateField("headline", event.target.value)} placeholder="예: 기업 리셉션 / VIP 고객응대 3년" className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze" /></label>
                <label className="space-y-2"><FieldLabel>경력 요약</FieldLabel><textarea value={formData.careerSummary} maxLength={3000} onChange={(event) => updateField("careerSummary", event.target.value)} className="min-h-28 w-full resize-y rounded-lg border border-brand-line px-4 py-3 text-sm leading-6 outline-none focus:border-brand-bronze" /></label>
                <label className="space-y-2"><FieldLabel>핵심 스킬</FieldLabel><input value={formData.skills} onChange={(event) => updateField("skills", event.target.value)} placeholder="고객응대, VIP응대, 안내데스크" className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze" /></label>
              </div>

              <div className="mt-7 border-t border-brand-line pt-6">
                <div className="flex items-center justify-between">
                  <div><h3 className="text-sm font-bold text-brand-espresso">경력</h3><p className="mt-1 text-[10px] text-brand-muted">최근 경험부터 입력하면 추천 정확도를 높이는 데 도움이 됩니다.</p></div>
                  <button type="button" onClick={() => setFormData((previous) => ({ ...previous, careers: [...previous.careers, { companyName: "", role: "", period: "", description: "" }] }))} className="rounded-lg border border-brand-line px-3 py-2 text-[10px] font-bold text-brand-bronze hover:bg-brand-ivory">+ 경력 추가</button>
                </div>

                <div className="mt-4 space-y-3">
                  {formData.careers.length === 0 ? <div className="rounded-lg border border-dashed border-brand-line bg-brand-light px-4 py-7 text-center text-xs text-brand-muted">등록된 경력이 없습니다.</div> : null}
                  {formData.careers.map((career, index) => (
                    <div key={`career-${index}`} className="rounded-lg border border-brand-line bg-brand-light/55 p-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <input value={career.companyName} onChange={(event) => updateCareer(index, "companyName", event.target.value)} placeholder="회사명" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs outline-none focus:border-brand-bronze" />
                        <input value={career.role} onChange={(event) => updateCareer(index, "role", event.target.value)} placeholder="직무" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs outline-none focus:border-brand-bronze" />
                        <input value={career.period} onChange={(event) => updateCareer(index, "period", event.target.value)} placeholder="2023.01 - 현재" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs outline-none focus:border-brand-bronze" />
                      </div>
                      <textarea value={career.description} onChange={(event) => updateCareer(index, "description", event.target.value)} placeholder="주요 업무와 경험" className="mt-3 min-h-20 w-full rounded-lg border border-brand-line px-3 py-2.5 text-xs leading-5 outline-none focus:border-brand-bronze" />
                      <button type="button" onClick={() => setFormData((previous) => ({ ...previous, careers: previous.careers.filter((_, itemIndex) => itemIndex !== index) }))} className="mt-2 text-[10px] font-semibold text-brand-danger">경력 삭제</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7 border-t border-brand-line pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-brand-espresso">학력</h3>
                  <button type="button" onClick={() => setFormData((previous) => ({ ...previous, education: [...previous.education, { schoolName: "", major: "", degree: "", period: "" }] }))} className="rounded-lg border border-brand-line px-3 py-2 text-[10px] font-bold text-brand-bronze hover:bg-brand-ivory">+ 학력 추가</button>
                </div>

                <div className="mt-4 space-y-3">
                  {formData.education.length === 0 ? <div className="rounded-lg border border-dashed border-brand-line bg-brand-light px-4 py-7 text-center text-xs text-brand-muted">등록된 학력이 없습니다.</div> : null}
                  {formData.education.map((item, index) => (
                    <div key={`education-${index}`} className="rounded-lg border border-brand-line bg-brand-light/55 p-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <input value={item.schoolName} onChange={(event) => updateEducation(index, "schoolName", event.target.value)} placeholder="학교명" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs outline-none focus:border-brand-bronze" />
                        <input value={item.major || ""} onChange={(event) => updateEducation(index, "major", event.target.value)} placeholder="전공" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs outline-none focus:border-brand-bronze" />
                        <input value={item.degree || ""} onChange={(event) => updateEducation(index, "degree", event.target.value)} placeholder="학위" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs outline-none focus:border-brand-bronze" />
                        <input value={item.period || ""} onChange={(event) => updateEducation(index, "period", event.target.value)} placeholder="2019.03 - 2023.02" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs outline-none focus:border-brand-bronze" />
                      </div>
                      <button type="button" onClick={() => setFormData((previous) => ({ ...previous, education: previous.education.filter((_, itemIndex) => itemIndex !== index) }))} className="mt-3 text-[10px] font-semibold text-brand-danger">학력 삭제</button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <div className="sticky top-24 rounded-xl border border-brand-line bg-white p-6 shadow-card">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-brand-bronze">AI Preview</p>
                <h2 className="font-editorial mt-3 text-[25px] text-brand-espresso">입력 정보 미리보기</h2>
                <div className="mt-5 divide-y divide-brand-line rounded-lg border border-brand-line">
                  {[ ["이름", formData.name || "미입력"], ["연락처", formData.phone || "미입력"], ["헤드라인", formData.headline || "미입력"], ["경력", `${formData.careers.length}개`], ["학력", `${formData.education.length}개`] ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[70px_minmax(0,1fr)] gap-3 px-4 py-3 text-[11px]"><span className="font-semibold text-brand-muted">{label}</span><span className="break-keep font-bold text-brand-ink">{value}</span></div>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-brand-success/20 bg-brand-success/10 px-4 py-3 text-[10px] leading-5 text-brand-success">
                  프로필 완성도 {profileCompleteness}% · 저장 전 입력 내용을 확인해주세요.
                </div>

                <div className="mt-5 grid gap-2">
                  <button type="button" onClick={() => void handleSaveProfile()} disabled={loading} className="rounded-lg bg-brand-bronze py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-espresso disabled:opacity-50">
                    {loading ? "저장 중..." : hasAuthenticatedAccount ? "Candidate 프로필 저장" : "가입하고 프로필 완성"}
                  </button>
                  {!hasAuthenticatedAccount ? <button type="button" onClick={() => setStep("INPUT")} className="rounded-lg border border-brand-line py-3 text-xs font-bold text-brand-bronze hover:bg-brand-ivory">AI 입력 단계로 돌아가기</button> : null}
                </div>

                <p className="mt-4 text-center text-[9px] leading-5 text-brand-muted">저장 후 지원현황과 프로필 관리는 Candidate Portal에서 이어집니다.</p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
