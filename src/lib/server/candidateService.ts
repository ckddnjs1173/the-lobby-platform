import {
  FieldValue,
} from "firebase-admin/firestore";

import type {
  CareerItem,
  EducationItem,
} from "../../types";

import {
  requireB2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

// ============================================================================
// Error
// ============================================================================

export class CandidateServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "CANDIDATE_SERVICE_ERROR"
  ) {
    super(message);

    this.name =
      "CandidateServiceError";

    this.status =
      status;

    this.code =
      code;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface CreatePassiveCandidateInput {
  name: string;
  phone: string;
  email: string;

  headline?: string;
  careerSummary?: string;
  skills?: string[];

  careers?: CareerItem[];
  education?: EducationItem[];
}

export interface CreatePassiveCandidateResult {
  candidateId: string;
  authUid: null;
  source: "B2B_DIRECT";
  accountStatus: "ACTIVE";

  createdBy: string;
  actorRole:
    | "ADMIN"
    | "RECRUITER";

  actorOrganizationId:
    | string
    | null;

  profileCompleteness: number;
}

// ============================================================================
// Constants
// ============================================================================

const RESERVED_INPUT_FIELDS = [
  "candidateId",
  "authUid",
  "source",
  "accountStatus",
  "createdAt",
  "updatedAt",
  "profileCompleteness",
  "createdBy",
  "organizationId",
] as const;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// Helpers
// ============================================================================

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

function sanitizeRequiredString(
  value: unknown,
  fieldLabel: string,
  maxLength: number,
  code: string
): string {
  if (
    typeof value !==
    "string"
  ) {
    throw new CandidateServiceError(
      `${fieldLabel} 정보가 필요합니다.`,
      400,
      code
    );
  }

  const trimmed =
    value.trim();

  if (
    !trimmed
  ) {
    throw new CandidateServiceError(
      `${fieldLabel} 정보가 필요합니다.`,
      400,
      code
    );
  }

  if (
    trimmed.length >
    maxLength
  ) {
    throw new CandidateServiceError(
      `${fieldLabel} 정보가 너무 깁니다.`,
      400,
      `${code}_TOO_LONG`
    );
  }

  return trimmed;
}

function sanitizeOptionalString(
  value: unknown,
  maxLength: number,
  fieldLabel: string
): string {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return "";
  }

  if (
    typeof value !==
    "string"
  ) {
    throw new CandidateServiceError(
      `${fieldLabel} 형식이 올바르지 않습니다.`,
      400,
      "INVALID_PROFILE_FIELD"
    );
  }

  const trimmed =
    value.trim();

  if (
    trimmed.length >
    maxLength
  ) {
    throw new CandidateServiceError(
      `${fieldLabel} 정보가 너무 깁니다.`,
      400,
      "PROFILE_FIELD_TOO_LONG"
    );
  }

  return trimmed;
}

function normalizeEmail(
  value: unknown
): string {
  const email =
    sanitizeRequiredString(
      value,
      "이메일",
      254,
      "EMAIL_REQUIRED"
    ).toLowerCase();

  if (
    !EMAIL_PATTERN.test(
      email
    )
  ) {
    throw new CandidateServiceError(
      "이메일 형식이 올바르지 않습니다.",
      400,
      "INVALID_EMAIL"
    );
  }

  return email;
}

function normalizeSkills(
  value: unknown
): string[] {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return [];
  }

  if (
    !Array.isArray(
      value
    )
  ) {
    throw new CandidateServiceError(
      "skills는 문자열 배열이어야 합니다.",
      400,
      "INVALID_SKILLS"
    );
  }

  const skills =
    value.map(
      (
        item
      ) => {
        if (
          typeof item !==
          "string"
        ) {
          throw new CandidateServiceError(
            "skills에는 문자열만 입력할 수 있습니다.",
            400,
            "INVALID_SKILLS"
          );
        }

        const trimmed =
          item.trim();

        if (
          trimmed.length >
          100
        ) {
          throw new CandidateServiceError(
            "개별 스킬은 100자를 초과할 수 없습니다.",
            400,
            "SKILL_TOO_LONG"
          );
        }

        return trimmed;
      }
    )
      .filter(
        Boolean
      );

  return Array.from(
    new Set(
      skills
    )
  ).slice(
    0,
    20
  );
}

function normalizeCareers(
  value: unknown
): CareerItem[] {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return [];
  }

  if (
    !Array.isArray(
      value
    )
  ) {
    throw new CandidateServiceError(
      "careers는 배열이어야 합니다.",
      400,
      "INVALID_CAREERS"
    );
  }

  return value
    .map(
      (
        item
      ): CareerItem => {
        if (
          !isRecord(
            item
          )
        ) {
          throw new CandidateServiceError(
            "경력 항목 형식이 올바르지 않습니다.",
            400,
            "INVALID_CAREER_ITEM"
          );
        }

        return {
          companyName:
            sanitizeRequiredString(
              item.companyName,
              "회사명",
              150,
              "CAREER_COMPANY_REQUIRED"
            ),

          role:
            sanitizeOptionalString(
              item.role,
              150,
              "경력 직무"
            ),

          period:
            sanitizeOptionalString(
              item.period,
              100,
              "경력 기간"
            ),

          description:
            sanitizeOptionalString(
              item.description,
              2_000,
              "경력 설명"
            ),
        };
      }
    )
    .slice(
      0,
      30
    );
}

function normalizeEducation(
  value: unknown
): EducationItem[] {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return [];
  }

  if (
    !Array.isArray(
      value
    )
  ) {
    throw new CandidateServiceError(
      "education은 배열이어야 합니다.",
      400,
      "INVALID_EDUCATION"
    );
  }

  return value
    .map(
      (
        item
      ): EducationItem => {
        if (
          !isRecord(
            item
          )
        ) {
          throw new CandidateServiceError(
            "학력 항목 형식이 올바르지 않습니다.",
            400,
            "INVALID_EDUCATION_ITEM"
          );
        }

        const schoolName =
          sanitizeRequiredString(
            item.schoolName,
            "학교명",
            200,
            "SCHOOL_NAME_REQUIRED"
          );

        const major =
          sanitizeOptionalString(
            item.major,
            200,
            "전공"
          );

        const degree =
          sanitizeOptionalString(
            item.degree,
            100,
            "학위"
          );

        const period =
          sanitizeOptionalString(
            item.period,
            100,
            "학력 기간"
          );

        return {
          schoolName,

          ...(major
            ? {
                major,
              }
            : {}),

          ...(degree
            ? {
                degree,
              }
            : {}),

          ...(period
            ? {
                period,
              }
            : {}),
        };
      }
    )
    .slice(
      0,
      20
    );
}

function calculateProfileCompleteness(
  input: {
    name: string;
    phone: string;
    email: string;
    headline: string;
    careerSummary: string;
    skills: string[];
    careers: CareerItem[];
    education: EducationItem[];
  }
): number {
  let score =
    0;

  if (
    input.name
  ) {
    score += 10;
  }

  if (
    input.phone
  ) {
    score += 10;
  }

  if (
    input.email
  ) {
    score += 10;
  }

  if (
    input.headline
  ) {
    score += 10;
  }

  if (
    input.careerSummary
  ) {
    score += 15;
  }

  if (
    input.skills.length >
    0
  ) {
    score += 15;
  }

  if (
    input.careers.length >
    0
  ) {
    score += 20;
  }

  if (
    input.education.length >
    0
  ) {
    score += 10;
  }

  return Math.min(
    score,
    100
  );
}

function normalizeInput(
  input: unknown
): CreatePassiveCandidateInput & {
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: EducationItem[];
} {
  if (
    !isRecord(
      input
    )
  ) {
    throw new CandidateServiceError(
      "후보자 데이터 형식이 올바르지 않습니다.",
      400,
      "INVALID_CANDIDATE_BODY"
    );
  }

  const forbiddenField =
    RESERVED_INPUT_FIELDS.find(
      (
        field
      ) =>
        Object.prototype.hasOwnProperty.call(
          input,
          field
        )
    );

  if (
    forbiddenField
  ) {
    throw new CandidateServiceError(
      `${forbiddenField} 필드는 서버에서 결정합니다.`,
      400,
      "FORBIDDEN_SERVER_FIELD"
    );
  }

  const name =
    sanitizeRequiredString(
      input.name,
      "이름",
      100,
      "NAME_REQUIRED"
    );

  const phone =
    sanitizeRequiredString(
      input.phone,
      "연락처",
      50,
      "PHONE_REQUIRED"
    );

  const email =
    normalizeEmail(
      input.email
    );

  const headline =
    sanitizeOptionalString(
      input.headline,
      200,
      "프로필 헤드라인"
    );

  const careerSummary =
    sanitizeOptionalString(
      input.careerSummary,
      3_000,
      "경력 요약"
    );

  const skills =
    normalizeSkills(
      input.skills
    );

  const careers =
    normalizeCareers(
      input.careers
    );

  const education =
    normalizeEducation(
      input.education
    );

  return {
    name,
    phone,
    email,
    headline,
    careerSummary,
    skills,
    careers,
    education,
  };
}

// ============================================================================
// Create Passive Candidate
// ============================================================================

/**
 * B2B 직접 발굴 Candidate 생성.
 *
 * 서버가 강제로 결정하는 필드:
 * - candidateId
 * - authUid = null
 * - source = B2B_DIRECT
 * - accountStatus = ACTIVE
 * - timestamp
 *
 * Candidate + Profile은 하나의 Firestore Transaction으로
 * 원자적으로 생성한다.
 */
export async function createB2BPassiveCandidate(
  actorUid: string,
  rawInput: unknown
): Promise<CreatePassiveCandidateResult> {
  const actor =
    await requireB2BActor(
      actorUid
    );

  const input =
    normalizeInput(
      rawInput
    );

  const db =
    getFirebaseAdminDb();

  const candidateReference =
    db
      .collection(
        "candidates"
      )
      .doc();

  const candidateId =
    candidateReference.id;

  const profileReference =
    db
      .collection(
        "profile"
      )
      .doc(
        candidateId
      );

  const profileCompleteness =
    calculateProfileCompleteness(
      input
    );

  await db.runTransaction(
    async (
      transaction
    ) => {
      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.set(
        candidateReference,
        {
          candidateId,

          authUid:
            null,

          name:
            input.name,

          phone:
            input.phone,

          email:
            input.email,

          source:
            "B2B_DIRECT",

          accountStatus:
            "ACTIVE",

          createdAt:
            serverTimestamp,

          updatedAt:
            serverTimestamp,
        }
      );

      transaction.set(
        profileReference,
        {
          candidateId,

          headline:
            input.headline,

          careerSummary:
            input.careerSummary,

          skills:
            input.skills,

          careers:
            input.careers,

          education:
            input.education,

          profileCompleteness,

          updatedAt:
            serverTimestamp,
        }
      );
    }
  );

  return {
    candidateId,

    authUid:
      null,

    source:
      "B2B_DIRECT",

    accountStatus:
      "ACTIVE",

    createdBy:
      actor.uid,

    actorRole:
      actor.role,

    actorOrganizationId:
      actor.organizationId,

    profileCompleteness,
  };
}
