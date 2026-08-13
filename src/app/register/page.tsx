"use client";

import {
  useState,
} from "react";

import {
  createUserWithEmailAndPassword,
} from "firebase/auth";

import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  useRouter,
} from "next/navigation";

import toast from "react-hot-toast";

import type {
  CareerItem,
  EducationItem,
} from "../../types";

import {
  auth,
  db,
} from "../../lib/firebase";

// ============================================================================
// Types
// ============================================================================

interface ResumeParseData {
  name: string;
  phone: string;
  email: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: EducationItem[];
  profileCompleteness: number;
}

interface ResumeParseResponse {
  success?: boolean;
  data?: ResumeParseData;
  error?: string;
  notice?: string;
}

interface FirebaseLikeError {
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

type EditableTextField =
  | "name"
  | "phone"
  | "email"
  | "password"
  | "headline"
  | "careerSummary"
  | "skills";

// ============================================================================
// Helpers
// ============================================================================

function skillsToArray(
  skillsText: string
): string[] {
  return Array.from(
    new Set(
      skillsText
        .split(",")
        .map((skill) =>
          skill.trim()
        )
        .filter(Boolean)
    )
  );
}

function calculateProfileCompleteness(
  formData: RegistrationFormData
): number {
  let score =
    0;

  if (
    formData.name.trim()
  ) {
    score += 10;
  }

  if (
    formData.phone.trim()
  ) {
    score += 10;
  }

  if (
    formData.email.trim()
  ) {
    score += 10;
  }

  if (
    formData.headline.trim()
  ) {
    score += 10;
  }

  if (
    formData.careerSummary.trim()
  ) {
    score += 15;
  }

  if (
    skillsToArray(
      formData.skills
    ).length > 0
  ) {
    score += 15;
  }

  if (
    formData.careers.length > 0
  ) {
    score += 20;
  }

  if (
    formData.education.length > 0
  ) {
    score += 10;
  }

  return Math.min(
    score,
    100
  );
}

// ============================================================================
// Component
// ============================================================================

export default function RegisterProfilePage() {
  const router =
    useRouter();

  const [
    step,
    setStep,
  ] = useState<
    "INPUT" | "PREVIEW"
  >("INPUT");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    resumeText,
    setResumeText,
  ] = useState("");

  const [
    formData,
    setFormData,
  ] =
    useState<RegistrationFormData>(
      {
        name: "",
        phone: "",
        email: "",
        password: "",
        headline: "",
        careerSummary: "",
        skills: "",
        careers: [],
        education: [],
      }
    );

  const profileCompleteness =
    calculateProfileCompleteness(
      formData
    );

  // ==========================================================================
  // Form Helpers
  // ==========================================================================

  const updateTextField =
    (
      field: EditableTextField,
      value: string
    ) => {
      setFormData(
        (
          previous
        ) => ({
          ...previous,
          [field]:
            value,
        })
      );
    };

  // ==========================================================================
  // AI Parse
  // ==========================================================================

  const handleAiParse =
    async () => {
      const trimmedResumeText =
        resumeText.trim();

      if (
        !trimmedResumeText
      ) {
        toast.error(
          "분석할 이력서 텍스트를 입력해주세요."
        );

        return;
      }

      setLoading(true);

      try {
        const response =
          await fetch(
            "/api/ai-parse-resume",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    resumeText:
                      trimmedResumeText,
                  }
                ),
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

        const parsed =
          result.data;

        setFormData(
          (
            previous
          ) => ({
            ...previous,

            name:
              parsed.name ||
              "",

            phone:
              parsed.phone ||
              "",

            email:
              (
                parsed.email ||
                ""
              )
                .trim()
                .toLowerCase(),

            /**
             * 비밀번호는 AI 분석과 무관하므로
             * 기존 사용자의 입력값을 유지한다.
             */
            password:
              previous.password,

            headline:
              parsed.headline ||
              "",

            careerSummary:
              parsed.careerSummary ||
              "",

            skills:
              Array.isArray(
                parsed.skills
              )
                ? parsed.skills.join(
                    ", "
                  )
                : "",

            careers:
              Array.isArray(
                parsed.careers
              )
                ? parsed.careers
                : [],

            education:
              Array.isArray(
                parsed.education
              )
                ? parsed.education
                : [],
          })
        );

        setStep(
          "PREVIEW"
        );

        toast.success(
          "AI가 이력서를 구조화했습니다. 내용을 확인해주세요."
        );
      } catch (error) {
        console.error(
          "Resume parse error:",
          error
        );

        toast.error(
          "이력서 분석 중 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================================================
  // Profile Save
  // ==========================================================================

  const handleSaveProfile =
    async () => {
      const name =
        formData.name.trim();

      const phone =
        formData.phone.trim();

      const email =
        formData.email
          .trim()
          .toLowerCase();

      const password =
        formData.password;

      if (
        !name ||
        !phone ||
        !email ||
        !password
      ) {
        toast.error(
          "이름, 연락처, 이메일, 비밀번호는 필수 입력 항목입니다."
        );

        return;
      }

      if (
        password.length < 6
      ) {
        toast.error(
          "비밀번호는 최소 6자리 이상 입력해주세요."
        );

        return;
      }

      const skills =
        skillsToArray(
          formData.skills
        );

      const completeness =
        calculateProfileCompleteness(
          formData
        );

      setLoading(true);

      try {
        // --------------------------------------------------------------------
        // 1. Firebase Authentication
        // --------------------------------------------------------------------

        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

        const user =
          userCredential.user;

        // --------------------------------------------------------------------
        // 2. The Lobby Candidate ID
        // --------------------------------------------------------------------
        //
        // Firebase Auth UID와 The Lobby Candidate PK는
        // 서로 다른 식별자다.
        // --------------------------------------------------------------------

        const candidateReference =
          doc(
            collection(
              db,
              "candidates"
            )
          );

        const candidateId =
          candidateReference.id;

        // --------------------------------------------------------------------
        // 3. Candidate
        // --------------------------------------------------------------------

        await setDoc(
          candidateReference,
          {
            candidateId,

            authUid:
              user.uid,

            name,

            phone,

            email,

            source:
              "B2C_SELF",

            accountStatus:
              "ACTIVE",

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );

        // --------------------------------------------------------------------
        // 4. Profile
        // --------------------------------------------------------------------

        await setDoc(
          doc(
            db,
            "profile",
            candidateId
          ),
          {
            candidateId,

            headline:
              formData.headline.trim(),

            careerSummary:
              formData.careerSummary.trim(),

            skills,

            careers:
              formData.careers,

            education:
              formData.education,

            profileCompleteness:
              completeness,

            updatedAt:
              serverTimestamp(),
          }
        );

        toast.success(
          "프로필이 성공적으로 생성되었습니다!"
        );

        router.push(
          "/jobs"
        );
      } catch (error) {
        console.error(
          "Profile registration error:",
          error
        );

        const firebaseError =
          error as FirebaseLikeError;

        if (
          firebaseError.code ===
          "auth/email-already-in-use"
        ) {
          toast.error(
            "이미 사용 중인 이메일입니다."
          );

          return;
        }

        if (
          firebaseError.code ===
          "auth/weak-password"
        ) {
          toast.error(
            "비밀번호는 최소 6자리 이상 입력해주세요."
          );

          return;
        }

        if (
          firebaseError.code ===
          "auth/invalid-email"
        ) {
          toast.error(
            "이메일 형식을 확인해주세요."
          );

          return;
        }

        if (
          firebaseError.code ===
          "permission-denied"
        ) {
          toast.error(
            "프로필 저장 권한을 확인할 수 없습니다."
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

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            The Lobby AI 프로필 빌더
          </h2>

          <p className="text-sm text-slate-500">
            기존 이력서를 붙여넣고
            마찰 없이 커리어 프로필을
            완성하세요.
          </p>
        </div>

        {step === "INPUT" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                기존 이력서 / 경력 기술서
                텍스트 붙여넣기
              </label>

              <textarea
                value={
                  resumeText
                }
                onChange={(
                  event
                ) =>
                  setResumeText(
                    event.target.value
                  )
                }
                placeholder="여기에 기존 이력서 내용을 그대로 복사해서 붙여넣으세요."
                className="w-full h-48 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-navy resize-none"
              />

              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                입력한 이력서 내용은
                프로필 구조화를 위해 AI
                API에 전송됩니다. The
                Lobby Firestore에는 이력서
                원문 자체를 저장하지
                않습니다.
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleAiParse
              }
              disabled={
                loading
              }
              className="w-full bg-brand-navy text-brand-gold py-4 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "AI 분석 중..."
                : "AI로 이력서 자동 구조화하기"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Completeness */}
            <div className="p-4 bg-brand-gold/10 border border-brand-gold/30 rounded-xl text-xs text-brand-navy font-medium">
              ✨ 프로필 완성도 가이드:{" "}
              <strong>
                {profileCompleteness}%
              </strong>{" "}
              - 아래 내용을 확인하고
              필요한 부분을 수정해주세요.
            </div>

            {/* Name / Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  이름 *
                </label>

                <input
                  type="text"
                  value={
                    formData.name
                  }
                  onChange={(
                    event
                  ) =>
                    updateTextField(
                      "name",
                      event.target.value
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                  placeholder="홍길동"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  연락처 *
                </label>

                <input
                  type="tel"
                  value={
                    formData.phone
                  }
                  onChange={(
                    event
                  ) =>
                    updateTextField(
                      "phone",
                      event.target.value
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                  placeholder="010-0000-0000"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Account */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  계정 이메일 *
                </label>

                <input
                  type="email"
                  value={
                    formData.email
                  }
                  onChange={(
                    event
                  ) =>
                    updateTextField(
                      "email",
                      event.target.value
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                  placeholder="example@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  비밀번호 *
                </label>

                <input
                  type="password"
                  value={
                    formData.password
                  }
                  onChange={(
                    event
                  ) =>
                    updateTextField(
                      "password",
                      event.target.value
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                  placeholder="최소 6자리 이상"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Headline */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 mt-2">
                프로필 헤드라인
              </label>

              <input
                type="text"
                value={
                  formData.headline
                }
                onChange={(
                  event
                ) =>
                  updateTextField(
                    "headline",
                    event.target.value
                  )
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                placeholder="예: 고객 응대 및 예약 관리 경험을 보유한 서비스 인재"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                핵심 역량 및 스킬
                (콤마로 구분)
              </label>

              <input
                type="text"
                value={
                  formData.skills
                }
                onChange={(
                  event
                ) =>
                  updateTextField(
                    "skills",
                    event.target.value
                  )
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                placeholder="고객 응대, 전화 응대, 일정 관리"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                경력 요약
              </label>

              <textarea
                value={
                  formData.careerSummary
                }
                onChange={(
                  event
                ) =>
                  updateTextField(
                    "careerSummary",
                    event.target.value
                  )
                }
                className="w-full h-28 p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy resize-none"
              />
            </div>

            {/* Structured Careers */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700">
                  추출된 경력
                </label>

                <span className="text-[11px] text-slate-400">
                  {
                    formData
                      .careers
                      .length
                  }
                  건
                </span>
              </div>

              {formData.careers.length >
              0 ? (
                <div className="space-y-2">
                  {formData.careers.map(
                    (
                      career,
                      index
                    ) => (
                      <div
                        key={`${career.companyName}-${career.period}-${index}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="text-sm font-bold text-slate-900">
                          {career.companyName ||
                            "회사명 미기재"}
                        </div>

                        <div className="mt-1 text-xs text-slate-600">
                          {[
                            career.role,
                            career.period,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              " · "
                            )}
                        </div>

                        {career.description ? (
                          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                            {
                              career.description
                            }
                          </p>
                        ) : null}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                  이력서에서 구조화할 수
                  있는 경력 항목이 없습니다.
                </div>
              )}
            </div>

            {/* Education */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700">
                  추출된 학력
                </label>

                <span className="text-[11px] text-slate-400">
                  {
                    formData
                      .education
                      .length
                  }
                  건
                </span>
              </div>

              {formData.education.length >
              0 ? (
                <div className="space-y-2">
                  {formData.education.map(
                    (
                      education,
                      index
                    ) => (
                      <div
                        key={`${education.schoolName}-${education.period ?? ""}-${index}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="text-xs font-bold text-slate-900">
                          {
                            education.schoolName
                          }
                        </div>

                        <div className="mt-1 text-xs leading-relaxed text-slate-600">
                          {[
                            education.major,
                            education.degree,
                            education.period,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              " · "
                            ) ||
                            "세부 학력 정보 없음"}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                  이력서에서 구조화할 수
                  있는 학력 항목이 없습니다.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setStep(
                    "INPUT"
                  )
                }
                disabled={
                  loading
                }
                className="w-1/3 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                다시 입력
              </button>

              <button
                type="button"
                onClick={
                  handleSaveProfile
                }
                disabled={
                  loading
                }
                className="w-2/3 bg-brand-navy text-brand-gold py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "저장 중..."
                  : "프로필 생성 및 완료"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}