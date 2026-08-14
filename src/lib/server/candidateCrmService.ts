import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import type {
  CareerItem,
  EducationItem,
} from "../../types";

import {
  requireB2BActor,
  type B2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class CandidateCrmServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "CANDIDATE_CRM_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "CandidateCrmServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface CandidateCrmDetail {
  candidateId: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  source: "B2B_DIRECT";
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdBy: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: EducationItem[];
  profileCompleteness: number;
  createdAt: string | null;
  updatedAt: string | null;
  profileUpdatedAt: string | null;
}

export interface UpdateCandidateCrmResult {
  changed: boolean;
  changedFields: string[];
  candidate: CandidateCrmDetail;
}

interface NormalizedUpdateInput {
  name: string;
  phone: string;
  email: string;
  headline: string;
  careerSummary: string;
  skills: string[];
}

const UPDATE_FIELDS = [
  "name",
  "phone",
  "email",
  "headline",
  "careerSummary",
  "skills",
] as const;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function normalizeCandidateId(
  value: string
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new CandidateCrmServiceError(
      "후보자 ID가 필요합니다.",
      400,
      "CANDIDATE_ID_REQUIRED"
    );
  }

  return normalized;
}

function requireString(
  data: DocumentData,
  key: string,
  code: string
): string {
  const value = data[key];

  if (!isNonEmptyString(value)) {
    throw new CandidateCrmServiceError(
      `${key} 정보가 누락되어 있습니다.`,
      409,
      code
    );
  }

  return value.trim();
}

function sanitizeRequiredString(
  value: unknown,
  label: string,
  maxLength: number,
  code: string
): string {
  if (typeof value !== "string") {
    throw new CandidateCrmServiceError(
      `${label} 정보가 필요합니다.`,
      400,
      code
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new CandidateCrmServiceError(
      `${label} 정보가 필요합니다.`,
      400,
      code
    );
  }

  if (normalized.length > maxLength) {
    throw new CandidateCrmServiceError(
      `${label} 정보가 너무 깁니다.`,
      400,
      `${code}_TOO_LONG`
    );
  }

  return normalized;
}

function sanitizeOptionalString(
  value: unknown,
  label: string,
  maxLength: number
): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new CandidateCrmServiceError(
      `${label} 형식이 올바르지 않습니다.`,
      400,
      "INVALID_PROFILE_FIELD"
    );
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new CandidateCrmServiceError(
      `${label} 정보가 너무 깁니다.`,
      400,
      "PROFILE_FIELD_TOO_LONG"
    );
  }

  return normalized;
}

function normalizeEmail(
  value: unknown
): string {
  const email = sanitizeRequiredString(
    value,
    "이메일",
    254,
    "EMAIL_REQUIRED"
  ).toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw new CandidateCrmServiceError(
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
  if (!Array.isArray(value)) {
    throw new CandidateCrmServiceError(
      "skills는 문자열 배열이어야 합니다.",
      400,
      "INVALID_SKILLS"
    );
  }

  const skills = value.map((item) => {
    if (typeof item !== "string") {
      throw new CandidateCrmServiceError(
        "skills에는 문자열만 입력할 수 있습니다.",
        400,
        "INVALID_SKILLS"
      );
    }

    const normalized = item.trim();

    if (normalized.length > 100) {
      throw new CandidateCrmServiceError(
        "개별 스킬은 100자를 초과할 수 없습니다.",
        400,
        "SKILL_TOO_LONG"
      );
    }

    return normalized;
  });

  return Array.from(
    new Set(skills.filter(Boolean))
  ).slice(0, 20);
}

function normalizeObjectArray<T extends object>(
  value: unknown
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is T =>
      typeof item === "object" &&
      item !== null &&
      !Array.isArray(item)
  );
}

function normalizeAccountStatus(
  value: unknown
): CandidateCrmDetail["accountStatus"] {
  if (
    value === "INACTIVE" ||
    value === "SUSPENDED"
  ) {
    return value;
  }

  return "ACTIVE";
}

function normalizeCompleteness(
  value: unknown
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(value))
  );
}

function timestampToIsoString(
  value: unknown
): string | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const timestamp = value as {
    toDate?: () => Date;
  };

  if (typeof timestamp.toDate !== "function") {
    return null;
  }

  try {
    return timestamp.toDate().toISOString();
  } catch {
    return null;
  }
}

function assertCandidateTenantAccess(
  actor: B2BActor,
  organizationId: string
): void {
  if (
    actor.role === "RECRUITER" &&
    actor.organizationId !== organizationId
  ) {
    throw new CandidateCrmServiceError(
      "다른 조직의 후보자에는 접근할 수 없습니다.",
      403,
      "TENANT_ACCESS_DENIED"
    );
  }
}

function assertB2BDirectCandidate(
  data: DocumentData
): void {
  if (
    data.source !== "B2B_DIRECT" ||
    data.authUid !== null
  ) {
    throw new CandidateCrmServiceError(
      "B2B 직접 등록 후보자만 Candidate CRM에서 관리할 수 있습니다.",
      409,
      "CANDIDATE_NOT_B2B_DIRECT"
    );
  }
}

function calculateProfileCompleteness(input: {
  name: string;
  phone: string;
  email: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: EducationItem[];
}): number {
  let score = 0;

  if (input.name) score += 10;
  if (input.phone) score += 10;
  if (input.email) score += 10;
  if (input.headline) score += 10;
  if (input.careerSummary) score += 15;
  if (input.skills.length > 0) score += 15;
  if (input.careers.length > 0) score += 20;
  if (input.education.length > 0) score += 10;

  return Math.min(score, 100);
}

function normalizeUpdateInput(
  rawInput: unknown
): NormalizedUpdateInput {
  if (!isRecord(rawInput)) {
    throw new CandidateCrmServiceError(
      "후보자 수정 데이터 형식이 올바르지 않습니다.",
      400,
      "INVALID_CANDIDATE_BODY"
    );
  }

  const unknownField = Object.keys(rawInput).find(
    (key) =>
      !(UPDATE_FIELDS as readonly string[]).includes(key)
  );

  if (unknownField) {
    throw new CandidateCrmServiceError(
      `${unknownField} 필드는 Candidate CRM에서 수정할 수 없습니다.`,
      400,
      "FORBIDDEN_UPDATE_FIELD"
    );
  }

  return {
    name: sanitizeRequiredString(
      rawInput.name,
      "이름",
      100,
      "NAME_REQUIRED"
    ),
    phone: sanitizeRequiredString(
      rawInput.phone,
      "연락처",
      50,
      "PHONE_REQUIRED"
    ),
    email: normalizeEmail(rawInput.email),
    headline: sanitizeOptionalString(
      rawInput.headline,
      "프로필 헤드라인",
      200
    ),
    careerSummary: sanitizeOptionalString(
      rawInput.careerSummary,
      "경력 요약",
      3000
    ),
    skills: normalizeSkills(rawInput.skills),
  };
}

function arraysEqual(
  left: string[],
  right: string[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

async function readCandidateDetail(
  actor: B2BActor,
  candidateId: string
): Promise<CandidateCrmDetail> {
  const db = getFirebaseAdminDb();
  const candidateSnapshot = await db
    .collection("candidates")
    .doc(candidateId)
    .get();

  if (!candidateSnapshot.exists) {
    throw new CandidateCrmServiceError(
      "후보자 정보를 찾을 수 없습니다.",
      404,
      "CANDIDATE_NOT_FOUND"
    );
  }

  const candidateData = candidateSnapshot.data();

  if (!candidateData) {
    throw new CandidateCrmServiceError(
      "후보자 데이터가 비어 있습니다.",
      409,
      "CANDIDATE_DATA_MISSING"
    );
  }

  assertB2BDirectCandidate(candidateData);

  const organizationId = requireString(
    candidateData,
    "organizationId",
    "CANDIDATE_ORGANIZATION_MISSING"
  );

  assertCandidateTenantAccess(actor, organizationId);

  const profileSnapshot = await db
    .collection("profile")
    .doc(candidateId)
    .get();

  const profileData = profileSnapshot.data() || {};

  return {
    candidateId,
    organizationId,
    name: requireString(
      candidateData,
      "name",
      "CANDIDATE_NAME_MISSING"
    ),
    phone: requireString(
      candidateData,
      "phone",
      "CANDIDATE_PHONE_MISSING"
    ),
    email: requireString(
      candidateData,
      "email",
      "CANDIDATE_EMAIL_MISSING"
    ),
    source: "B2B_DIRECT",
    accountStatus: normalizeAccountStatus(
      candidateData.accountStatus
    ),
    createdBy: requireString(
      candidateData,
      "createdBy",
      "CANDIDATE_CREATED_BY_MISSING"
    ),
    headline: isNonEmptyString(profileData.headline)
      ? profileData.headline.trim()
      : "",
    careerSummary: isNonEmptyString(profileData.careerSummary)
      ? profileData.careerSummary.trim()
      : "",
    skills: Array.isArray(profileData.skills)
      ? profileData.skills
          .filter(
            (item): item is string =>
              typeof item === "string" &&
              item.trim().length > 0
          )
          .map((item) => item.trim())
          .slice(0, 20)
      : [],
    careers: normalizeObjectArray<CareerItem>(
      profileData.careers
    ),
    education: normalizeObjectArray<EducationItem>(
      profileData.education
    ),
    profileCompleteness: normalizeCompleteness(
      profileData.profileCompleteness
    ),
    createdAt: timestampToIsoString(
      candidateData.createdAt
    ),
    updatedAt: timestampToIsoString(
      candidateData.updatedAt
    ),
    profileUpdatedAt: timestampToIsoString(
      profileData.updatedAt
    ),
  };
}

export async function getB2BCandidateDetail(
  actorUid: string,
  candidateIdInput: string
): Promise<CandidateCrmDetail> {
  const actor = await requireB2BActor(actorUid);
  const candidateId = normalizeCandidateId(
    candidateIdInput
  );

  return readCandidateDetail(actor, candidateId);
}

export async function updateB2BCandidateProfile(
  actorUid: string,
  candidateIdInput: string,
  rawInput: unknown
): Promise<UpdateCandidateCrmResult> {
  const actor = await requireB2BActor(actorUid);
  const candidateId = normalizeCandidateId(
    candidateIdInput
  );
  const input = normalizeUpdateInput(rawInput);
  const db = getFirebaseAdminDb();

  const candidateRef = db
    .collection("candidates")
    .doc(candidateId);
  const profileRef = db
    .collection("profile")
    .doc(candidateId);
  const eventRef = db
    .collection("candidateEvents")
    .doc();

  const applicationSnapshot = await db
    .collection("applications")
    .where("candidateId", "==", candidateId)
    .get();

  const applicationRefs = applicationSnapshot.docs.map(
    (document) => document.ref
  );

  let changed = false;
  let changedFields: string[] = [];

  await db.runTransaction(async (transaction) => {
    const candidateSnapshot = await transaction.get(
      candidateRef
    );
    const profileSnapshot = await transaction.get(
      profileRef
    );

    if (!candidateSnapshot.exists) {
      throw new CandidateCrmServiceError(
        "후보자 정보를 찾을 수 없습니다.",
        404,
        "CANDIDATE_NOT_FOUND"
      );
    }

    const candidateData = candidateSnapshot.data();

    if (!candidateData) {
      throw new CandidateCrmServiceError(
        "후보자 데이터가 비어 있습니다.",
        409,
        "CANDIDATE_DATA_MISSING"
      );
    }

    assertB2BDirectCandidate(candidateData);

    const organizationId = requireString(
      candidateData,
      "organizationId",
      "CANDIDATE_ORGANIZATION_MISSING"
    );

    assertCandidateTenantAccess(actor, organizationId);

    const profileData = profileSnapshot.data() || {};
    const currentSkills = Array.isArray(profileData.skills)
      ? profileData.skills
          .filter(
            (item): item is string =>
              typeof item === "string" &&
              item.trim().length > 0
          )
          .map((item) => item.trim())
      : [];

    const comparisons: [string, boolean][] = [
      ["name", candidateData.name !== input.name],
      ["phone", candidateData.phone !== input.phone],
      ["email", candidateData.email !== input.email],
      ["headline", (profileData.headline || "") !== input.headline],
      [
        "careerSummary",
        (profileData.careerSummary || "") !== input.careerSummary,
      ],
      ["skills", !arraysEqual(currentSkills, input.skills)],
    ];

    changedFields = comparisons
      .filter(([, isChanged]) => isChanged)
      .map(([field]) => field);

    if (changedFields.length === 0) {
      return;
    }

    changed = true;

    const careers = normalizeObjectArray<CareerItem>(
      profileData.careers
    );
    const education = normalizeObjectArray<EducationItem>(
      profileData.education
    );
    const profileCompleteness =
      calculateProfileCompleteness({
        ...input,
        careers,
        education,
      });
    const serverTimestamp = FieldValue.serverTimestamp();

    transaction.update(candidateRef, {
      name: input.name,
      phone: input.phone,
      email: input.email,
      updatedAt: serverTimestamp,
    });

    transaction.set(
      profileRef,
      {
        candidateId,
        headline: input.headline,
        careerSummary: input.careerSummary,
        skills: input.skills,
        careers,
        education,
        profileCompleteness,
        updatedAt: serverTimestamp,
      },
      {
        merge: true,
      }
    );

    for (const applicationRef of applicationRefs) {
      transaction.update(applicationRef, {
        candidateSnapshot: {
          name: input.name,
          phone: input.phone,
          email: input.email,
        },
      });
    }

    transaction.set(eventRef, {
      eventId: eventRef.id,
      candidateId,
      organizationId,
      type: "PROFILE_UPDATED",
      changedBy: actor.uid,
      metadata: {
        changedFields,
        synchronizedApplications:
          applicationRefs.length,
      },
      createdAt: serverTimestamp,
    });
  });

  const candidate = await readCandidateDetail(
    actor,
    candidateId
  );

  return {
    changed,
    changedFields,
    candidate,
  };
}
