"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  CandidateWorkflowApiError,
  createDirectApplicationViaApi,
  createPassiveCandidateViaApi,
  parsePassiveCandidateResumeFileViaApi,
  parsePassiveCandidateResumeViaApi,
  type ResumeParseResult,
} from "../../../../lib/candidateWorkflowApi";
import {
  JobApiError,
  fetchB2BJobs,
  type B2BJobView,
} from "../../../../lib/jobApi";
import type { CareerItem, EducationItem } from "../../../../types";

const MAX_RESUME_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_RESUME_EXTENSIONS = new Set([".pdf", ".docx", ".txt"]);

function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

export default function NewPassiveCandidatePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<B2BJobView[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [savingMode, setSavingMode] = useState<"POOL" | "PLACEMENT" | null>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [aiProfileCompleteness, setAiProfileCompleteness] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [careerSummary, setCareerSummary] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [careers, setCareers] = useState<CareerItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [jobId, setJobId] = useState("");
  const [createdCandidateId, setCreatedCandidateId] = useState<string | null>(null);
  const [createdApplicationId, setCreatedApplicationId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingJobs(true);

    fetchB2BJobs()
      .then((data) => {
        if (!cancelled) setJobs(data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("B2B jobs load failed:", error);
        toast.error(
          error instanceof JobApiError
            ? error.message
            : "공고 목록을 불러오지 못했습니다."
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingJobs(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openJobs = useMemo(
    () => jobs.filter((job) => job.status === "OPEN"),
    [jobs]
  );

  const selectedJob = useMemo(
    () => openJobs.find((job) => job.jobId === jobId) || null,
    [openJobs, jobId]
  );

  const applyParsedResume = (parsed: ResumeParseResult) => {
    setName(parsed.name || "");
    setPhone(parsed.phone || "");
    setEmail((parsed.email || "").trim().toLowerCase());
    setHeadline(parsed.headline || "");
    setCareerSummary(parsed.careerSummary || "");
    setSkillsText(Array.isArray(parsed.skills) ? parsed.skills.join(", ") : "");
    setCareers(Array.isArray(parsed.careers) ? parsed.careers : []);
    setEducation(Array.isArray(parsed.education) ? parsed.education : []);
    setAiProfileCompleteness(parsed.profileCompleteness);
  };

  const showParseError = (error: unknown) => {
    console.error("Passive candidate resume parse failed:", error);
    toast.error(
      error instanceof CandidateWorkflowApiError
        ? error.message
        : "이력서 분석 중 오류가 발생했습니다."
    );
  };

  const handleAiParse = async () => {
    const normalizedResumeText = resumeText.trim();
    if (!normalizedResumeText) {
      toast.error("분석할 이력서 텍스트를 입력해주세요.");
      return;
    }

    setAiParsing(true);
    try {
      const parsed = await parsePassiveCandidateResumeViaApi(normalizedResumeText);
      applyParsedResume(parsed);
      toast.success("AI 분석이 완료되었습니다. 저장 전에 추출 내용을 확인해주세요.");
    } catch (error) {
      showParseError(error);
    } finally {
      setAiParsing(false);
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

    setAiParsing(true);
    try {
      const parsed = await parsePassiveCandidateResumeFileViaApi(resumeFile);
      applyParsedResume(parsed);
      toast.success(`${resumeFile.name} 분석이 완료되었습니다. 저장 전에 추출 내용을 확인해주세요.`);
    } catch (error) {
      showParseError(error);
    } finally {
      setAiParsing(false);
    }
  };

  const validateCandidate = (): boolean => {
    if (!name.trim() || !phone.trim() || !email.trim()) {
      toast.error("이름, 연락처, 이메일은 필수입니다.");
      return false;
    }
    return true;
  };

  const createCandidate = async () => {
    const skills = skillsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return createPassiveCandidateViaApi({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      headline: headline.trim(),
      careerSummary: careerSummary.trim(),
      skills,
      careers,
      education,
    });
  };

  const handleSave = async (mode: "POOL" | "PLACEMENT") => {
    if (savingMode || aiParsing || !validateCandidate()) return;

    if (mode === "PLACEMENT" && !jobId) {
      toast.error("공고에 바로 투입하려면 OPEN 공고를 선택해주세요.");
      return;
    }

    setSavingMode(mode);
    setCreatedCandidateId(null);
    setCreatedApplicationId(null);

    let candidateId: string | null = null;

    try {
      const candidate = await createCandidate();
      candidateId = candidate.candidateId;
      setCreatedCandidateId(candidate.candidateId);

      if (mode === "POOL") {
        toast.success("후보자를 Talent Pool에 저장했습니다.");
        return;
      }

      const application = await createDirectApplicationViaApi(candidate.candidateId, jobId);
      setCreatedApplicationId(application.applicationId);
      toast.success("후보자 저장과 공고 투입이 완료되었습니다.");
    } catch (error) {
      console.error("Passive candidate workflow failed:", error);

      if (error instanceof CandidateWorkflowApiError) {
        toast.error(
          candidateId && mode === "PLACEMENT"
            ? `후보자는 저장됐지만 공고 투입에 실패했습니다: ${error.message}`
            : error.message
        );
      } else {
        toast.error(
          candidateId && mode === "PLACEMENT"
            ? "후보자는 저장됐지만 공고 투입 중 오류가 발생했습니다."
            : "후보자 등록 중 오류가 발생했습니다."
        );
      }
    } finally {
      setSavingMode(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">후보자 등록</h1>
            <span className="rounded-md bg-brand-gold/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-navy">
              AI Intake
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            이력서를 구조화해 Talent Pool에 저장하고, 필요하면 OPEN 공고에 바로 투입합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/b2b-admin/candidates")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          후보자 CRM으로 이동
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900">1. AI 이력서 자동 입력</h2>
                <p className="mt-1 text-xs text-slate-400">
                  PDF·DOCX·TXT 파일 또는 이력서 원문을 구조화합니다. 결과는 저장 전 직접 검토합니다.
                </p>
              </div>
              {aiProfileCompleteness !== null ? (
                <div className="shrink-0 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-right">
                  <div className="text-[10px] font-semibold text-emerald-600">AI 추출 완성도</div>
                  <div className="text-sm font-bold text-emerald-800">{aiProfileCompleteness}%</div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-700">이력서 파일 업로드</div>
                  <p className="mt-1 text-[11px] text-slate-400">PDF / DOCX / TXT · 최대 8MB</p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleResumeFileChange}
                  disabled={aiParsing || savingMode !== null}
                  className="block max-w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-navy file:ring-1 file:ring-slate-200 disabled:opacity-50"
                />
              </div>

              {resumeFile ? (
                <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-700">{resumeFile.name}</div>
                    <div className="text-[10px] text-slate-400">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleResumeFileParse()}
                    disabled={aiParsing || savingMode !== null}
                    className="rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-brand-gold disabled:opacity-40"
                  >
                    {aiParsing ? "파일 분석 중..." : "파일 AI 분석"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-semibold text-slate-400">또는 텍스트 붙여넣기</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <textarea
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              maxLength={40000}
              disabled={aiParsing || savingMode !== null}
              className="h-40 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 focus:outline-none focus:border-brand-navy disabled:opacity-60"
              placeholder="이력서 또는 경력기술서 텍스트를 붙여넣으세요."
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-5 text-slate-400">
                업로드 원본과 원문은 AI 구조화에만 사용하며 Firestore에는 저장하지 않습니다.
              </p>
              <button
                type="button"
                onClick={() => void handleAiParse()}
                disabled={aiParsing || savingMode !== null || !resumeText.trim()}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-brand-gold disabled:opacity-40"
              >
                {aiParsing ? "AI 분석 중..." : "텍스트 AI 분석"}
              </button>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <div>
              <h2 className="font-bold text-slate-900">2. 기본 정보 검토</h2>
              <p className="mt-1 text-xs text-slate-400">AI 추출값을 포함해 Recruiter가 최종 확인합니다.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">이름 *</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">연락처 *</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={50} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy" />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">이메일 *</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy" />
            </label>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <div>
              <h2 className="font-bold text-slate-900">3. 프로필 검토</h2>
              <p className="mt-1 text-xs text-slate-400">요약과 스킬을 수정하고 잘못 추출된 경력·학력은 제외할 수 있습니다.</p>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">프로필 헤드라인</span>
              <input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={200} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy" />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">경력 요약</span>
              <textarea value={careerSummary} onChange={(event) => setCareerSummary(event.target.value)} maxLength={3000} className="h-28 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy" />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">핵심 스킬</span>
              <input value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="고객응대, 영어, 안내데스크" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy" />
            </label>

            {careers.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">경력 {careers.length}건</span>
                  <span className="text-[11px] text-slate-400">상세 수정은 등록 후 CRM에서 가능합니다.</span>
                </div>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {careers.map((career, index) => (
                    <div key={`${career.companyName}-${career.period}-${index}`} className="flex items-start justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800">{career.companyName || "회사명 없음"}</div>
                        <div className="mt-1 text-xs text-slate-500">{[career.role, career.period].filter(Boolean).join(" · ") || "상세 정보 없음"}</div>
                      </div>
                      <button type="button" onClick={() => setCareers((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} className="text-[11px] font-semibold text-rose-500">제외</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {education.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-600">학력 {education.length}건</span>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {education.map((item, index) => (
                    <div key={`${item.schoolName}-${item.period || ""}-${index}`} className="flex items-start justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800">{item.schoolName}</div>
                        <div className="mt-1 text-xs text-slate-500">{[item.major, item.degree, item.period].filter(Boolean).join(" · ") || "상세 정보 없음"}</div>
                      </div>
                      <button type="button" onClick={() => setEducation((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} className="text-[11px] font-semibold text-rose-500">제외</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <div>
              <h2 className="font-bold text-slate-900">4. 선택적 공고 투입</h2>
              <p className="mt-1 text-xs text-slate-400">
                공고 선택은 선택사항입니다. 후보자만 저장한 뒤 CRM에서 나중에 여러 공고에 재투입할 수 있습니다.
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">OPEN 공고 선택</span>
              <select
                value={jobId}
                onChange={(event) => setJobId(event.target.value)}
                disabled={loadingJobs || savingMode !== null}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-navy disabled:bg-slate-50"
              >
                <option value="">{loadingJobs ? "공고 불러오는 중..." : "나중에 투입 / 공고 선택 안 함"}</option>
                {openJobs.map((job) => (
                  <option key={job.jobId} value={job.jobId}>
                    {job.title} · {job.displayCompany || job.company}
                  </option>
                ))}
              </select>
            </label>

            {openJobs.length === 0 && !loadingJobs ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                현재 OPEN 공고가 없어도 후보자는 Talent Pool에 저장할 수 있습니다.
              </div>
            ) : null}
          </section>

          <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void handleSave("POOL")}
              disabled={savingMode !== null || aiParsing}
              className="rounded-xl border border-brand-navy bg-white px-4 py-3 text-sm font-bold text-brand-navy disabled:opacity-40"
            >
              {savingMode === "POOL" ? "Talent Pool 저장 중..." : "후보자만 Talent Pool에 저장"}
            </button>
            <button
              type="button"
              onClick={() => void handleSave("PLACEMENT")}
              disabled={savingMode !== null || aiParsing || !jobId}
              className="rounded-xl bg-brand-navy px-4 py-3 text-sm font-bold text-brand-gold disabled:opacity-40"
            >
              {savingMode === "PLACEMENT" ? "저장 및 투입 중..." : "후보자 저장 후 선택 공고에 투입"}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">등록 방식</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold text-slate-800">Talent Pool 저장</div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">포지션이 정해지지 않은 후보자를 먼저 확보합니다.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold text-slate-800">저장 + 공고 투입</div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">후보자를 저장한 뒤 선택한 OPEN 공고에 Application을 생성합니다.</p>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">AI Intake 상태</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] font-semibold text-slate-400">경력</div><div className="mt-1 text-lg font-bold text-slate-800">{careers.length}</div></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] font-semibold text-slate-400">학력</div><div className="mt-1 text-lg font-bold text-slate-800">{education.length}</div></div>
            </div>
            <p className="text-[11px] leading-5 text-slate-400">AI 초안은 자동 저장되지 않습니다. Recruiter의 최종 저장 동작이 필요합니다.</p>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">선택 공고</h2>
            {selectedJob ? (
              <div className="space-y-2 text-sm">
                <div className="font-bold text-brand-navy">{selectedJob.title}</div>
                <div className="text-slate-600">{selectedJob.displayCompany || selectedJob.company}</div>
                <div className="text-xs text-slate-400">{selectedJob.location} · {selectedJob.employmentType}</div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">선택하지 않아도 후보자 저장이 가능합니다.</p>
            )}
          </div>

          {createdCandidateId ? (
            <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <div className="font-bold text-emerald-800">후보자 저장 완료</div>
              <div className="break-all font-mono text-xs text-emerald-700">{createdCandidateId}</div>
              {createdApplicationId ? (
                <div className="break-all font-mono text-[11px] text-emerald-700">Application: {createdApplicationId}</div>
              ) : null}
              <button
                type="button"
                onClick={() => router.push(`/b2b-admin/candidates/${encodeURIComponent(createdCandidateId)}`)}
                className="w-full rounded-lg border border-emerald-200 bg-white py-2 text-xs font-bold text-emerald-800"
              >
                후보자 CRM 상세에서 확인
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
