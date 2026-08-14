"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

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

import type {
  CareerItem,
  EducationItem,
} from "../../../../types";

const MAX_RESUME_FILE_BYTES =
  8 * 1024 * 1024;

const ALLOWED_RESUME_EXTENSIONS =
  new Set([
    ".pdf",
    ".docx",
    ".txt",
  ]);

function getFileExtension(
  fileName: string
): string {
  const index = fileName.lastIndexOf(".");

  return index >= 0
    ? fileName.slice(index).toLowerCase()
    : "";
}

export default function NewPassiveCandidatePage() {
  const router = useRouter();

  const [jobs, setJobs] =
    useState<B2BJobView[]>([]);

  const [loadingJobs, setLoadingJobs] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [aiParsing, setAiParsing] =
    useState(false);

  const [resumeText, setResumeText] =
    useState("");

  const [resumeFile, setResumeFile] =
    useState<File | null>(null);

  const [aiProfileCompleteness, setAiProfileCompleteness] =
    useState<number | null>(null);

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [headline, setHeadline] =
    useState("");

  const [careerSummary, setCareerSummary] =
    useState("");

  const [skillsText, setSkillsText] =
    useState("");

  const [careers, setCareers] =
    useState<CareerItem[]>([]);

  const [education, setEducation] =
    useState<EducationItem[]>([]);

  const [jobId, setJobId] =
    useState("");

  const [createdApplicationId, setCreatedApplicationId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoadingJobs(true);

    fetchB2BJobs()
      .then((data) => {
        if (!cancelled) {
          setJobs(data);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "B2B jobs load failed:",
          error
        );

        if (error instanceof JobApiError) {
          toast.error(error.message);
        } else {
          toast.error(
            "공고 목록을 불러오지 못했습니다."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingJobs(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openJobs = useMemo(
    () =>
      jobs.filter(
        (job) => job.status === "OPEN"
      ),
    [jobs]
  );

  const selectedJob = useMemo(
    () =>
      openJobs.find(
        (job) => job.jobId === jobId
      ) || null,
    [openJobs, jobId]
  );

  const applyParsedResume = (
    parsed: ResumeParseResult
  ) => {
    setName(parsed.name || "");
    setPhone(parsed.phone || "");
    setEmail(
      (parsed.email || "")
        .trim()
        .toLowerCase()
    );
    setHeadline(parsed.headline || "");
    setCareerSummary(
      parsed.careerSummary || ""
    );
    setSkillsText(
      Array.isArray(parsed.skills)
        ? parsed.skills.join(", ")
        : ""
    );
    setCareers(
      Array.isArray(parsed.careers)
        ? parsed.careers
        : []
    );
    setEducation(
      Array.isArray(parsed.education)
        ? parsed.education
        : []
    );
    setAiProfileCompleteness(
      parsed.profileCompleteness
    );
  };

  const showParseError = (
    error: unknown
  ) => {
    console.error(
      "Passive candidate resume parse failed:",
      error
    );

    if (
      error instanceof CandidateWorkflowApiError
    ) {
      toast.error(error.message);
    } else {
      toast.error(
        "이력서 분석 중 오류가 발생했습니다."
      );
    }
  };

  const handleAiParse = async () => {
    const normalizedResumeText =
      resumeText.trim();

    if (!normalizedResumeText) {
      toast.error(
        "분석할 이력서 텍스트를 입력해주세요."
      );
      return;
    }

    setAiParsing(true);

    try {
      const parsed =
        await parsePassiveCandidateResumeViaApi(
          normalizedResumeText
        );

      applyParsedResume(parsed);

      toast.success(
        "AI 분석이 완료되었습니다. 저장 전에 추출 내용을 확인해주세요."
      );
    } catch (error) {
      showParseError(error);
    } finally {
      setAiParsing(false);
    }
  };

  const handleResumeFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0] || null;

    if (!file) {
      setResumeFile(null);
      return;
    }

    if (
      !ALLOWED_RESUME_EXTENSIONS.has(
        getFileExtension(file.name)
      )
    ) {
      toast.error(
        "PDF, DOCX, TXT 파일만 선택할 수 있습니다."
      );
      event.currentTarget.value = "";
      setResumeFile(null);
      return;
    }

    if (file.size > MAX_RESUME_FILE_BYTES) {
      toast.error(
        "이력서 파일은 8MB 이하만 업로드할 수 있습니다."
      );
      event.currentTarget.value = "";
      setResumeFile(null);
      return;
    }

    setResumeFile(file);
  };

  const handleResumeFileParse = async () => {
    if (!resumeFile) {
      toast.error(
        "분석할 이력서 파일을 선택해주세요."
      );
      return;
    }

    setAiParsing(true);

    try {
      const parsed =
        await parsePassiveCandidateResumeFileViaApi(
          resumeFile
        );

      applyParsedResume(parsed);

      toast.success(
        `${resumeFile.name} 분석이 완료되었습니다. 저장 전에 추출 내용을 확인해주세요.`
      );
    } catch (error) {
      showParseError(error);
    } finally {
      setAiParsing(false);
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !name.trim() ||
      !phone.trim() ||
      !email.trim()
    ) {
      toast.error(
        "이름, 연락처, 이메일은 필수입니다."
      );
      return;
    }

    if (!jobId) {
      toast.error(
        "후보자를 등록할 공개 공고를 선택해주세요."
      );
      return;
    }

    const skills = skillsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setSaving(true);
    setCreatedApplicationId(null);

    let candidateId: string | null = null;

    try {
      const candidate =
        await createPassiveCandidateViaApi({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          headline: headline.trim(),
          careerSummary: careerSummary.trim(),
          skills,
          careers,
          education,
        });

      candidateId = candidate.candidateId;

      const application =
        await createDirectApplicationViaApi(
          candidate.candidateId,
          jobId
        );

      setCreatedApplicationId(
        application.applicationId
      );

      toast.success(
        "후보자 등록과 공고 투입이 완료되었습니다."
      );
    } catch (error) {
      console.error(
        "Passive candidate workflow failed:",
        error
      );

      if (
        error instanceof CandidateWorkflowApiError
      ) {
        if (candidateId) {
          toast.error(
            `후보자 등록은 완료됐지만 공고 투입에 실패했습니다: ${error.message}`
          );
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error(
          candidateId
            ? "후보자 등록은 완료됐지만 공고 투입 중 오류가 발생했습니다."
            : "후보자 등록 중 오류가 발생했습니다."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              후보자 등록
            </h1>
            <span className="rounded-md bg-brand-gold/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-navy">
              AI Intake
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            이력서를 구조화한 뒤 검토하고 B2B_DIRECT 후보자로 등록합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push("/b2b-admin")
          }
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          지원자 관리로 이동
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
        >
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  1. AI 이력서 자동 입력
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  PDF·DOCX·TXT 파일을 올리거나 이력서 원문을 붙여넣으면 기본 정보와 경력·학력을 구조화합니다.
                </p>
              </div>

              {aiProfileCompleteness !== null ? (
                <div className="shrink-0 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-right">
                  <div className="text-[10px] font-semibold text-emerald-600">
                    AI 추출 완성도
                  </div>
                  <div className="text-sm font-bold text-emerald-800">
                    {aiProfileCompleteness}%
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-700">
                    이력서 파일 업로드
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    PDF / DOCX / TXT · 최대 8MB · PDF 최대 30페이지
                  </p>
                </div>

                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleResumeFileChange}
                  disabled={aiParsing || saving}
                  className="block max-w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-navy file:ring-1 file:ring-slate-200 hover:file:bg-slate-100 disabled:opacity-50"
                />
              </div>

              {resumeFile ? (
                <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-700">
                      {resumeFile.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResumeFileParse}
                    disabled={aiParsing || saving}
                    className="shrink-0 rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-brand-gold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {aiParsing
                      ? "파일 분석 중..."
                      : "파일 AI 분석"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-semibold text-slate-400">
                또는 텍스트 붙여넣기
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <textarea
              value={resumeText}
              onChange={(event) =>
                setResumeText(event.target.value)
              }
              maxLength={40000}
              disabled={aiParsing || saving}
              className="w-full h-40 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 resize-y focus:outline-none focus:border-brand-navy disabled:opacity-60"
              placeholder="이력서 또는 경력기술서 텍스트를 붙여넣으세요."
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-5 text-slate-400">
                업로드 원본 파일과 추출 원문은 AI 구조화에만 사용하고 Firestore에는 저장하지 않습니다. AI 결과는 저장 전 반드시 검토해주세요.
              </p>

              <button
                type="button"
                onClick={handleAiParse}
                disabled={aiParsing || saving || !resumeText.trim()}
                className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-brand-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {aiParsing
                  ? "AI 분석 중..."
                  : "텍스트 AI 분석"}
              </button>
            </div>
          </section>

          <section className="space-y-4 pt-5 border-t border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900">
                2. 기본 정보 검토
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                AI가 입력한 값도 Recruiter가 직접 수정할 수 있습니다.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">
                  이름 *
                </span>
                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  maxLength={100}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy"
                  placeholder="홍길동"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">
                  연락처 *
                </span>
                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  maxLength={50}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy"
                  placeholder="010-0000-0000"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">
                이메일 *
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                maxLength={254}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy"
                placeholder="candidate@example.com"
              />
            </label>
          </section>

          <section className="space-y-4 pt-5 border-t border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900">
                3. 프로필 검토
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                요약과 스킬은 자유롭게 수정하고, 잘못 추출된 경력·학력은 저장 전에 제외할 수 있습니다.
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">
                프로필 헤드라인
              </span>
              <input
                value={headline}
                onChange={(event) =>
                  setHeadline(event.target.value)
                }
                maxLength={200}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy"
                placeholder="예: 호텔·기업 리셉션 5년 경력"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">
                경력 요약
              </span>
              <textarea
                value={careerSummary}
                onChange={(event) =>
                  setCareerSummary(event.target.value)
                }
                maxLength={3000}
                className="w-full h-28 rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-navy"
                placeholder="최근 경력과 주요 업무를 간단히 입력하세요."
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">
                핵심 스킬
              </span>
              <input
                value={skillsText}
                onChange={(event) =>
                  setSkillsText(event.target.value)
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy"
                placeholder="고객응대, 영어, 안내데스크"
              />
              <span className="block text-[11px] text-slate-400">
                쉼표(,)로 구분합니다.
              </span>
            </label>

            {careers.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    경력 {careers.length}건
                  </span>
                  <span className="text-[11px] text-slate-400">
                    상세 수정은 등록 후 CRM에서 가능합니다.
                  </span>
                </div>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {careers.map((career, index) => (
                    <div
                      key={`${career.companyName}-${career.period}-${index}`}
                      className="flex items-start justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800">
                          {career.companyName || "회사명 없음"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {[career.role, career.period]
                            .filter(Boolean)
                            .join(" · ") || "상세 정보 없음"}
                        </div>
                        {career.description ? (
                          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-400">
                            {career.description}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setCareers((previous) =>
                            previous.filter(
                              (_, itemIndex) =>
                                itemIndex !== index
                            )
                          )
                        }
                        className="shrink-0 text-[11px] font-semibold text-rose-500 hover:text-rose-700"
                      >
                        제외
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {education.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-600">
                  학력 {education.length}건
                </span>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {education.map((item, index) => (
                    <div
                      key={`${item.schoolName}-${item.period || ""}-${index}`}
                      className="flex items-start justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800">
                          {item.schoolName}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {[item.major, item.degree, item.period]
                            .filter(Boolean)
                            .join(" · ") || "상세 정보 없음"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setEducation((previous) =>
                            previous.filter(
                              (_, itemIndex) =>
                                itemIndex !== index
                            )
                          )
                        }
                        className="shrink-0 text-[11px] font-semibold text-rose-500 hover:text-rose-700"
                      >
                        제외
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-4 pt-5 border-t border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900">
                4. 공고 투입
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                현재 권한으로 접근 가능한 OPEN 공고만 표시됩니다.
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">
                공고 선택 *
              </span>
              <select
                value={jobId}
                onChange={(event) =>
                  setJobId(event.target.value)
                }
                disabled={loadingJobs || saving}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-navy disabled:bg-slate-50"
              >
                <option value="">
                  {loadingJobs
                    ? "공고 불러오는 중..."
                    : "공개 공고를 선택하세요"}
                </option>
                {openJobs.map((job) => (
                  <option
                    key={job.jobId}
                    value={job.jobId}
                  >
                    {job.title} · {job.displayCompany || job.company}
                  </option>
                ))}
              </select>
            </label>

            {openJobs.length === 0 && !loadingJobs ? (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
                현재 공개 중인 공고가 없습니다. 먼저 공고 관리에서 공고를 OPEN 상태로 만들어주세요.
              </div>
            ) : null}
          </section>

          <button
            type="submit"
            disabled={saving || aiParsing || loadingJobs || openJobs.length === 0}
            className="w-full py-3 rounded-xl bg-brand-navy text-brand-gold font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? "후보자 등록 및 공고 투입 중..."
              : "검토한 후보자 등록 후 공고에 투입"}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-slate-900">
              AI Intake 상태
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] font-semibold text-slate-400">
                  경력
                </div>
                <div className="mt-1 text-lg font-bold text-slate-800">
                  {careers.length}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] font-semibold text-slate-400">
                  학력
                </div>
                <div className="mt-1 text-lg font-bold text-slate-800">
                  {education.length}
                </div>
              </div>
            </div>

            <p className="text-[11px] leading-5 text-slate-400">
              AI가 만든 초안은 자동 저장되지 않습니다. Recruiter가 검토 후 등록 버튼을 눌러야 Candidate와 Profile이 생성됩니다.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-slate-900">
              선택 공고
            </h2>

            {selectedJob ? (
              <div className="space-y-2 text-sm">
                <div className="font-bold text-brand-navy">
                  {selectedJob.title}
                </div>
                <div className="text-slate-600">
                  {selectedJob.displayCompany || selectedJob.company}
                </div>
                <div className="text-xs text-slate-400">
                  {selectedJob.location} · {selectedJob.employmentType}
                </div>
                <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                  OPEN
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                공고를 선택하면 이곳에 요약이 표시됩니다.
              </p>
            )}
          </div>

          <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 space-y-2">
            <h2 className="font-bold text-brand-gold">
              B2B Direct Workflow
            </h2>
            <p className="text-xs leading-5 text-slate-400">
              AI는 입력 초안만 만들고, Candidate와 Profile의 실제 저장은 인증된 서버 API가 수행합니다. 조직, source, createdBy는 클라이언트가 정하지 않습니다.
            </p>
          </div>

          {createdApplicationId ? (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 space-y-3">
              <div className="font-bold text-emerald-800">
                등록 완료
              </div>
              <div className="text-xs text-emerald-700 break-all font-mono">
                {createdApplicationId}
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push("/b2b-admin")
                }
                className="w-full py-2 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-xs font-bold"
              >
                지원자 관리에서 확인
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
