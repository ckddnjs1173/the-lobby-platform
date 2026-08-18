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

const MAX_RESUME_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_RESUME_EXTENSIONS = new Set([".pdf", ".docx", ".txt"]);

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
  code?: string;
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

function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold text-brand-ink">{children}</span>;
}

export default function RegisterProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState<"INPUT" | "PREVIEW">("INPUT");
  const [loading, setLoading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
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
    field: "name" | "phone" | "email" | "password" | "headline" | "careerSummary" | "skills",
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

  const applyParsedResume = (parsed: ResumeParseData) => {
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
  };

  const parseResponse = async (response: Response) => {
    const result = (await response.json()) as ResumeParseResponse;
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.error || "이력서 분석에 실패했습니다.");
    }
    applyParsedResume(result.data);
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
      await parseResponse(response);
    } catch (error) {
      console.error("Resume parse failed:", error);
      toast.error(error instanceof Error ? error.message : "이력서 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setResumeFile(null);
      return;
    }

    if (!ALLOWED_RESUME_EXTENSIONS.has(getFileExtension(file.name))) {
      toast.error("PDF, DOCX, TXT 파일만 선택할 수 있습니다.");
      event.currentTarget.value = "";
      setResumeFile(null);
      return;
    }

    if (file.size > MAX_RESUME_FILE_BYTES) {
      toast.error("이력서 파일은 8MB 이하만 업로드할 수 있습니다.");
      event.currentTarget.value = "";
      setResumeFile(null);
      return;
    }

    setResumeFile(file);
  };

  const handleResumeFileParse = async () => {
    if (!resumeFile) {
      toast.error("분석할 이력서 파일을 선택해주세요.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", resumeFile);
      const response = await fetch("/api/ai-parse-resume", {
        method: "POST",
        body: formData,
      });
      await parseResponse(response);
    } catch (error) {
      console.error("Resume file parse failed:", error);
      toast.error(error instanceof Error ? error.message : "이력서 파일 분석 중 오류가 발생했습니다.");
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

      toast.success(result.created ? "Candidate 프로필이 생성되었습니다." : "기존 Candidate 프로필을 확인했습니다.");
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
        toast.error(`${error.message} 로그인 계정은 유지되므로 내용을 수정한 뒤 다시 저장할 수 있습니다.`);
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
      <main className="mx-auto max-w-[1380px] px-5 pb-16 pt-28 sm:px-8 lg:px-10">
        <section className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-brand-bronze">Candidate Profile</p>
            <h1 className="font-editorial mt-3 text-[40px] tracking-[-0.045em] text-brand-espresso sm:text-[48px]">1분 프로필 등록</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
              PDF·DOCX·TXT 이력서를 올리거나 텍스트를 붙여넣어 AI로 구조화한 뒤 직접 검토해 저장하세요.
            </p>
          </div>
          <div className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
            <p className="text-[10px] font-bold text-brand-muted">프로필 완성도</p>
            <p className="font-editorial mt-1 text-[32px] text-brand-espresso">{profileCompleteness}%</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-cream">
              <div className="h-full rounded-full bg-brand-bronze transition-all" style={{ width: `${profileCompleteness}%` }} />
            </div>
          </div>
        </section>

        {step === "INPUT" ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-8">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-brand-bronze">AI Resume Intake</p>
              <h2 className="font-editorial mt-3 text-[28px] text-brand-espresso">이력서 빠른 등록</h2>
              <p className="mt-2 text-xs leading-6 text-brand-muted">파일과 원문은 구조화에만 사용하고 Firestore에는 저장하지 않습니다.</p>

              <div className="mt-6 rounded-xl border border-dashed border-brand-line bg-brand-light p-5">
                <FieldLabel>이력서 파일</FieldLabel>
                <p className="mt-1 text-[10px] text-brand-muted">PDF / DOCX / TXT · 최대 8MB</p>
                <label
                  className={`mt-4 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-lg border border-brand-line bg-white px-4 py-3 transition hover:border-brand-gold/55 hover:bg-brand-ivory ${loading ? "pointer-events-none opacity-50" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold text-brand-bronze">
                      {resumeFile ? "다른 파일 선택" : "이력서 파일 선택"}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-brand-muted">
                      {resumeFile ? resumeFile.name : "PDF, DOCX, TXT 파일을 선택해주세요."}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md bg-brand-espresso px-3 py-2 text-[10px] font-bold text-white">
                    찾아보기
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleResumeFileChange}
                    disabled={loading}
                    className="sr-only"
                  />
                </label>
                {resumeFile ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-brand-line/80 bg-white/70 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-brand-ink">{resumeFile.name}</p>
                      <p className="mt-1 text-[9px] text-brand-muted">
                        {(resumeFile.size / 1024 / 1024).toFixed(2)} MB · 업로드 전 AI 분석
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      disabled={loading}
                      className="shrink-0 text-[10px] font-bold text-brand-muted transition hover:text-brand-danger disabled:opacity-50"
                    >
                      제거
                    </button>
                  </div>
                ) : null}
                {resumeFile ? (
                  <button
                    type="button"
                    onClick={() => void handleResumeFileParse()}
                    disabled={loading}
                    className="mt-3 w-full rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white shadow-card transition hover:bg-brand-espresso disabled:opacity-50"
                  >
                    {loading ? "파일 분석 중..." : "선택한 이력서 AI 분석"}
                  </button>
                ) : null}
              </div>

              <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-brand-line" /><span className="text-[10px] text-brand-muted">또는 텍스트 붙여넣기</span><div className="h-px flex-1 bg-brand-line" /></div>

              <textarea
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="기존 이력서 또는 경력기술서 내용을 붙여넣으세요."
                maxLength={40000}
                className="h-[240px] w-full resize-y rounded-lg border border-brand-line bg-brand-light p-4 text-sm leading-6 outline-none focus:border-brand-bronze focus:bg-white"
              />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => void handleAiParse()} disabled={loading || !resumeText.trim()} className="rounded-lg bg-brand-espresso px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50">{loading ? "AI 분석 중..." : "텍스트 AI 분석"}</button>
                <button type="button" onClick={() => setStep("PREVIEW")} disabled={loading} className="rounded-lg border border-brand-line bg-white px-5 py-3.5 text-sm font-bold text-brand-bronze">직접 입력으로 계속</button>
              </div>
            </section>

            <aside className="rounded-xl bg-brand-espresso p-8 text-white shadow-card">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-brand-cream/65">The Lobby Profile</p>
              <h2 className="font-editorial mt-4 text-[31px] leading-[1.4]">한 번 만든 프로필로 여러 포지션에 간편하게 지원하세요.</h2>
              <div className="mt-8 space-y-5 text-xs leading-6 text-white/65">
                <p>AI 추출 결과는 자동 저장되지 않습니다.</p>
                <p>이름·연락처·경력·학력을 직접 확인하고 수정한 뒤 저장합니다.</p>
                <p>지원 이후에는 Candidate Portal에서 전형 단계와 면접 일정을 확인합니다.</p>
              </div>
              <p className="mt-10 text-xs text-white/55">이미 가입했다면 <Link href="/login" className="font-bold text-brand-cream underline">로그인</Link></p>
            </aside>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <section className="rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-8">
              <div className="flex flex-col justify-between gap-4 border-b border-brand-line pb-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Profile Information</p>
                  <h2 className="font-editorial mt-2 text-[27px] text-brand-espresso">프로필 정보 검토</h2>
                </div>
                <button type="button" onClick={() => setStep("INPUT")} className="text-xs font-bold text-brand-bronze">이력서 다시 분석</button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2"><FieldLabel>이름 *</FieldLabel><input value={formData.name} onChange={(event) => updateField("name", event.target.value)} className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze" /></label>
                <label className="space-y-2"><FieldLabel>연락처 *</FieldLabel><input value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze" /></label>
                <label className="space-y-2"><FieldLabel>이메일 *</FieldLabel><input type="email" value={formData.email} disabled={hasAuthenticatedAccount} onChange={(event) => updateField("email", event.target.value)} className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze disabled:bg-brand-ivory" /></label>
                {!hasAuthenticatedAccount ? <label className="space-y-2"><FieldLabel>비밀번호 *</FieldLabel><input type="password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} autoComplete="new-password" className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze" /></label> : <div />}
              </div>

              <div className="mt-5 grid gap-4">
                <label className="space-y-2"><FieldLabel>프로필 헤드라인</FieldLabel><input value={formData.headline} onChange={(event) => updateField("headline", event.target.value)} maxLength={200} className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze" /></label>
                <label className="space-y-2"><FieldLabel>경력 요약</FieldLabel><textarea value={formData.careerSummary} onChange={(event) => updateField("careerSummary", event.target.value)} maxLength={3000} className="min-h-28 w-full resize-y rounded-lg border border-brand-line px-4 py-3 text-sm leading-6 outline-none focus:border-brand-bronze" /></label>
                <label className="space-y-2"><FieldLabel>핵심 스킬</FieldLabel><input value={formData.skills} onChange={(event) => updateField("skills", event.target.value)} placeholder="고객응대, VIP응대, 안내데스크" className="w-full rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze" /></label>
              </div>

              <div className="mt-7 border-t border-brand-line pt-6">
                <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-brand-espresso">경력</h3><p className="mt-1 text-[10px] text-brand-muted">회사명과 직무를 중심으로 입력하세요.</p></div><button type="button" onClick={() => setFormData((previous) => ({ ...previous, careers: [...previous.careers, { companyName: "", role: "", period: "", description: "" }] }))} className="rounded-lg border border-brand-line px-3 py-2 text-[10px] font-bold text-brand-bronze">+ 경력 추가</button></div>
                <div className="mt-4 space-y-3">
                  {formData.careers.length === 0 ? <div className="rounded-lg border border-dashed border-brand-line px-4 py-7 text-center text-xs text-brand-muted">등록된 경력이 없습니다.</div> : null}
                  {formData.careers.map((career, index) => (
                    <div key={`career-${index}`} className="rounded-lg border border-brand-line bg-brand-light/55 p-4">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input value={career.companyName} onChange={(event) => updateCareer(index, "companyName", event.target.value)} placeholder="회사명" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs" />
                        <input value={career.role} onChange={(event) => updateCareer(index, "role", event.target.value)} placeholder="직무" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs" />
                        <input value={career.period} onChange={(event) => updateCareer(index, "period", event.target.value)} placeholder="기간" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs" />
                      </div>
                      <textarea value={career.description} onChange={(event) => updateCareer(index, "description", event.target.value)} placeholder="주요 업무" className="mt-2 min-h-16 w-full rounded-lg border border-brand-line px-3 py-2 text-xs" />
                      <button type="button" onClick={() => setFormData((previous) => ({ ...previous, careers: previous.careers.filter((_, itemIndex) => itemIndex !== index) }))} className="mt-2 text-[10px] font-bold text-brand-danger">삭제</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7 border-t border-brand-line pt-6">
                <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-brand-espresso">학력</h3><button type="button" onClick={() => setFormData((previous) => ({ ...previous, education: [...previous.education, { schoolName: "", major: "", degree: "", period: "" }] }))} className="rounded-lg border border-brand-line px-3 py-2 text-[10px] font-bold text-brand-bronze">+ 학력 추가</button></div>
                <div className="mt-4 space-y-3">
                  {formData.education.length === 0 ? <div className="rounded-lg border border-dashed border-brand-line px-4 py-7 text-center text-xs text-brand-muted">등록된 학력이 없습니다.</div> : null}
                  {formData.education.map((item, index) => (
                    <div key={`education-${index}`} className="rounded-lg border border-brand-line bg-brand-light/55 p-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input value={item.schoolName} onChange={(event) => updateEducation(index, "schoolName", event.target.value)} placeholder="학교명" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs" />
                        <input value={item.major || ""} onChange={(event) => updateEducation(index, "major", event.target.value)} placeholder="전공" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs" />
                        <input value={item.degree || ""} onChange={(event) => updateEducation(index, "degree", event.target.value)} placeholder="학위" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs" />
                        <input value={item.period || ""} onChange={(event) => updateEducation(index, "period", event.target.value)} placeholder="기간" className="rounded-lg border border-brand-line px-3 py-2.5 text-xs" />
                      </div>
                      <button type="button" onClick={() => setFormData((previous) => ({ ...previous, education: previous.education.filter((_, itemIndex) => itemIndex !== index) }))} className="mt-2 text-[10px] font-bold text-brand-danger">삭제</button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-bronze">Ready to Save</p>
                <p className="font-editorial mt-2 text-[30px] text-brand-espresso">{profileCompleteness}%</p>
                <p className="mt-2 text-xs leading-5 text-brand-muted">저장 후에도 마이페이지에서 프로필을 계속 수정할 수 있습니다.</p>
                <button type="button" onClick={() => void handleSaveProfile()} disabled={loading} className="mt-5 w-full rounded-lg bg-brand-bronze py-3.5 text-sm font-bold text-white shadow-card disabled:opacity-50">{loading ? "저장 중..." : hasAuthenticatedAccount ? "프로필 저장" : "가입하고 프로필 저장"}</button>
              </section>
              <section className="rounded-xl border border-brand-line bg-brand-ivory/60 p-5 text-[11px] leading-6 text-brand-muted">
                계정 생성 시 입력한 정보는 Candidate Portal과 지원 처리에 사용됩니다. 운영 전 개인정보 처리방침과 이용약관 링크를 최종 확정해야 합니다.
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
