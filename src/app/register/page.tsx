"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";

import toast from "react-hot-toast";

import CandidateHeader from "../../components/candidate/CandidateHeader";

import {
  CandidatePortalApiError,
  bootstrapCandidateProfileViaApi,
  fetchCandidatePortalProfile,
} from "../../lib/candidatePortalApi";

import {
  auth,
} from "../../lib/firebase";

import type {
  CareerItem,
  EducationItem,
} from "../../types";

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

function skillsToArray(
  value: string
): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function calculateCompleteness(
  form: RegistrationFormData
): number {
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

export default function RegisterProfilePage() {
  const router = useRouter();
  const [step, setStep] =
    useState<"INPUT" | "PREVIEW">("INPUT");
  const [loading, setLoading] =
    useState(false);
  const [resumeText, setResumeText] =
    useState("");
  const [hasAuthenticatedAccount, setHasAuthenticatedAccount] =
    useState(false);
  const [formData, setFormData] =
    useState<RegistrationFormData>({
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
    return onAuthStateChanged(
      auth,
      async (user) => {
        setHasAuthenticatedAccount(Boolean(user));

        if (!user) {
          return;
        }

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
      }
    );
  }, [router]);

  const profileCompleteness =
    calculateCompleteness(formData);

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
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateCareer = (
    index: number,
    field: keyof CareerItem,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      careers: previous.careers.map(
        (career, careerIndex) =>
          careerIndex === index
            ? {
                ...career,
                [field]: value,
              }
            : career
      ),
    }));
  };

  const updateEducation = (
    index: number,
    field: keyof EducationItem,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      education: previous.education.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item
      ),
    }));
  };

  const handleAiParse = async () => {
    const source = resumeText.trim();

    if (!source) {
      toast.error(
        "분석할 이력서 텍스트를 입력해주세요."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/ai-parse-resume",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resumeText: source,
          }),
        }
      );
      const result =
        (await response.json()) as ResumeParseResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        toast.error(
          result.error ||
            "이력서 분석에 실패했습니다."
        );
        return;
      }

      const parsed = result.data;

      setFormData((previous) => ({
        ...previous,
        name: parsed.name || previous.name,
        phone: parsed.phone || previous.phone,
        email:
          auth.currentUser?.email ||
          parsed.email ||
          previous.email,
        headline: parsed.headline || "",
        careerSummary:
          parsed.careerSummary || "",
        skills:
          Array.isArray(parsed.skills)
            ? parsed.skills.join(", ")
            : "",
        careers:
          Array.isArray(parsed.careers)
            ? parsed.careers
            : [],
        education:
          Array.isArray(parsed.education)
            ? parsed.education
            : [],
      }));
      setStep("PREVIEW");
      toast.success(
        "AI가 이력서를 구조화했습니다. 저장 전에 내용을 확인해주세요."
      );
    } catch (error) {
      console.error(
        "Resume parse failed:",
        error
      );
      toast.error(
        "이력서 분석 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    const name = formData.name.trim();
    const phone = formData.phone.trim();
    const email = formData.email
      .trim()
      .toLowerCase();

    if (!name || !phone || !email) {
      toast.error(
        "이름, 연락처, 이메일은 필수 입력 항목입니다."
      );
      return;
    }

    if (
      !auth.currentUser &&
      formData.password.length < 6
    ) {
      toast.error(
        "비밀번호는 최소 6자리 이상 입력해주세요."
      );
      return;
    }

    setLoading(true);

    try {
      if (!auth.currentUser) {
        await createUserWithEmailAndPassword(
          auth,
          email,
          formData.password
        );
      }

      const result =
        await bootstrapCandidateProfileViaApi({
          name,
          phone,
          headline: formData.headline.trim(),
          careerSummary:
            formData.careerSummary.trim(),
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
      console.error(
        "Candidate registration failed:",
        error
      );

      const firebaseError =
        error as FirebaseLikeError;

      if (
        firebaseError.code ===
        "auth/email-already-in-use"
      ) {
        toast.error(
          "이미 가입된 이메일입니다. 로그인 후 이용해주세요."
        );
        router.push("/login");
        return;
      }

      if (
        firebaseError.code === "auth/weak-password"
      ) {
        toast.error(
          "비밀번호는 최소 6자리 이상 입력해주세요."
        );
        return;
      }

      if (
        firebaseError.code === "auth/invalid-email"
      ) {
        toast.error(
          "이메일 형식을 확인해주세요."
        );
        return;
      }

      if (error instanceof CandidatePortalApiError) {
        toast.error(
          `${error.message} 로그인 계정은 유지되므로 내용을 수정한 뒤 다시 저장할 수 있습니다.`
        );
        setHasAuthenticatedAccount(
          Boolean(auth.currentUser)
        );
        return;
      }

      toast.error(
        "프로필 저장 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <CandidateHeader />

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-24">
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="space-y-2 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
              Candidate Profile
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              The Lobby 커리어 프로필 만들기
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              이력서를 AI로 빠르게 구조화하거나 직접 입력해서 시작할 수 있습니다.
            </p>
          </div>

          {step === "INPUT" ? (
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">
                  기존 이력서 / 경력 기술서
                </span>
                <textarea
                  value={resumeText}
                  onChange={(event) =>
                    setResumeText(event.target.value)
                  }
                  placeholder="기존 이력서 내용을 붙여넣으세요."
                  className="h-48 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-brand-navy"
                />
              </label>

              <p className="text-[11px] leading-5 text-slate-400">
                이력서 원문은 프로필 구조화에만 사용되며 The Lobby Firestore에 원문 자체를 저장하지 않습니다.
              </p>

              <button
                type="button"
                onClick={() => void handleAiParse()}
                disabled={loading}
                className="w-full rounded-xl bg-brand-navy py-3.5 text-sm font-bold text-brand-gold disabled:opacity-50"
              >
                {loading
                  ? "AI 분석 중..."
                  : "AI로 자동 구조화"}
              </button>

              <button
                type="button"
                onClick={() => setStep("PREVIEW")}
                className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                이력서 없이 직접 입력
              </button>

              <p className="text-center text-xs text-slate-500">
                이미 가입했다면{" "}
                <Link
                  href="/login"
                  className="font-bold text-brand-navy"
                >
                  로그인
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 p-3 text-xs font-semibold text-brand-navy">
                프로필 완성도 {profileCompleteness}% · 저장 전에 AI 결과 또는 직접 입력 내용을 확인해주세요.
              </div>

              {hasAuthenticatedAccount ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs leading-5 text-indigo-700">
                  로그인 계정이 이미 만들어져 있습니다. 비밀번호를 다시 입력할 필요 없이 Candidate 프로필 저장을 이어갈 수 있습니다.
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-bold text-slate-700">
                  이름 *
                  <input
                    value={formData.name}
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-navy"
                  />
                </label>

                <label className="space-y-1 text-xs font-bold text-slate-700">
                  연락처 *
                  <input
                    value={formData.phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-navy"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-bold text-slate-700">
                  이메일 *
                  <input
                    type="email"
                    value={formData.email}
                    disabled={hasAuthenticatedAccount}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-navy disabled:bg-slate-100"
                  />
                </label>

                {!hasAuthenticatedAccount ? (
                  <label className="space-y-1 text-xs font-bold text-slate-700">
                    비밀번호 *
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(event) =>
                        updateField(
                          "password",
                          event.target.value
                        )
                      }
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-navy"
                    />
                  </label>
                ) : (
                  <div />
                )}
              </div>

              <label className="block space-y-1 text-xs font-bold text-slate-700">
                프로필 헤드라인
                <input
                  value={formData.headline}
                  maxLength={200}
                  onChange={(event) =>
                    updateField(
                      "headline",
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-navy"
                  placeholder="예: 기업 리셉션 / VIP 고객응대 3년"
                />
              </label>

              <label className="block space-y-1 text-xs font-bold text-slate-700">
                경력 요약
                <textarea
                  value={formData.careerSummary}
                  maxLength={3000}
                  onChange={(event) =>
                    updateField(
                      "careerSummary",
                      event.target.value
                    )
                  }
                  className="min-h-28 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal leading-6 outline-none focus:border-brand-navy"
                />
              </label>

              <label className="block space-y-1 text-xs font-bold text-slate-700">
                핵심 스킬
                <input
                  value={formData.skills}
                  onChange={(event) =>
                    updateField(
                      "skills",
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-navy"
                  placeholder="고객응대, VIP응대, 안내데스크"
                />
              </label>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-slate-800">
                    경력
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((previous) => ({
                        ...previous,
                        careers: [
                          ...previous.careers,
                          {
                            companyName: "",
                            role: "",
                            period: "",
                            description: "",
                          },
                        ],
                      }))
                    }
                    className="text-xs font-bold text-brand-navy"
                  >
                    + 경력 추가
                  </button>
                </div>

                {formData.careers.map((career, index) => (
                  <div
                    key={`career-${index}`}
                    className="space-y-2 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={career.companyName}
                        onChange={(event) =>
                          updateCareer(
                            index,
                            "companyName",
                            event.target.value
                          )
                        }
                        placeholder="회사명"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                      <input
                        value={career.role}
                        onChange={(event) =>
                          updateCareer(
                            index,
                            "role",
                            event.target.value
                          )
                        }
                        placeholder="직무"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                      <input
                        value={career.period}
                        onChange={(event) =>
                          updateCareer(
                            index,
                            "period",
                            event.target.value
                          )
                        }
                        placeholder="2023.01 - 현재"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                    </div>
                    <textarea
                      value={career.description}
                      onChange={(event) =>
                        updateCareer(
                          index,
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="주요 업무"
                      className="min-h-16 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((previous) => ({
                          ...previous,
                          careers:
                            previous.careers.filter(
                              (_, itemIndex) =>
                                itemIndex !== index
                            ),
                        }))
                      }
                      className="text-[11px] font-semibold text-rose-600"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-slate-800">
                    학력
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((previous) => ({
                        ...previous,
                        education: [
                          ...previous.education,
                          {
                            schoolName: "",
                            major: "",
                            degree: "",
                            period: "",
                          },
                        ],
                      }))
                    }
                    className="text-xs font-bold text-brand-navy"
                  >
                    + 학력 추가
                  </button>
                </div>

                {formData.education.map((item, index) => (
                  <div
                    key={`education-${index}`}
                    className="space-y-2 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={item.schoolName}
                        onChange={(event) =>
                          updateEducation(
                            index,
                            "schoolName",
                            event.target.value
                          )
                        }
                        placeholder="학교명"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                      <input
                        value={item.major || ""}
                        onChange={(event) =>
                          updateEducation(
                            index,
                            "major",
                            event.target.value
                          )
                        }
                        placeholder="전공"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                      <input
                        value={item.degree || ""}
                        onChange={(event) =>
                          updateEducation(
                            index,
                            "degree",
                            event.target.value
                          )
                        }
                        placeholder="학위"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                      <input
                        value={item.period || ""}
                        onChange={(event) =>
                          updateEducation(
                            index,
                            "period",
                            event.target.value
                          )
                        }
                        placeholder="2019.03 - 2023.02"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((previous) => ({
                          ...previous,
                          education:
                            previous.education.filter(
                              (_, itemIndex) =>
                                itemIndex !== index
                            ),
                        }))
                      }
                      className="text-[11px] font-semibold text-rose-600"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                {!hasAuthenticatedAccount ? (
                  <button
                    type="button"
                    onClick={() => setStep("INPUT")}
                    className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600"
                  >
                    이전
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={loading}
                  className="flex-[2] rounded-xl bg-brand-navy py-3 text-sm font-bold text-brand-gold disabled:opacity-50"
                >
                  {loading
                    ? "저장 중..."
                    : hasAuthenticatedAccount
                      ? "Candidate 프로필 저장"
                      : "가입하고 Candidate 프로필 만들기"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
