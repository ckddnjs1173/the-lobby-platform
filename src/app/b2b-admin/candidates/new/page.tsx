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
} from "../../../../lib/candidateWorkflowApi";

import {
  JobApiError,
  fetchB2BJobs,
  type B2BJobView,
} from "../../../../lib/jobApi";

export default function NewPassiveCandidatePage() {
  const router = useRouter();

  const [jobs, setJobs] =
    useState<B2BJobView[]>([]);

  const [loadingJobs, setLoadingJobs] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

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
          <h1 className="text-2xl font-bold text-slate-900">
            후보자 직접등록
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Passive Candidate를 등록하고 공개 공고에 바로 투입합니다.
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

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
        >
          <section className="space-y-4">
            <div>
              <h2 className="font-bold text-slate-900">
                1. 기본 정보
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Firebase Auth 계정을 만들지 않는 B2B_DIRECT 후보자로 저장됩니다.
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
                2. 프로필 요약
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                상세 경력은 추후 후보자 프로필에서 확장할 수 있습니다.
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
          </section>

          <section className="space-y-4 pt-5 border-t border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900">
                3. 공고 투입
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
            disabled={saving || loadingJobs || openJobs.length === 0}
            className="w-full py-3 rounded-xl bg-brand-navy text-brand-gold font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? "후보자 등록 및 공고 투입 중..."
              : "후보자 등록 후 공고에 투입"}
          </button>
        </form>

        <aside className="space-y-4">
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
              후보자는 Firebase Auth 없이 생성되고, 지원서는 서버가 candidateId와 jobId를 결합한 결정론적 ID로 생성합니다. 조직, 담당자, source, changedBy는 클라이언트 입력을 신뢰하지 않고 서버가 결정합니다.
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
