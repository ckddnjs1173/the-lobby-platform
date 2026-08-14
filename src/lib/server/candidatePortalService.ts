import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import type {
  ApplicationStage,
  CareerItem,
  EducationItem,
  EventType,
} from "../../types";

import type {
  CandidatePortalApplicationView,
  CandidatePortalBootstrapResult,
  CandidatePortalInterviewView,
  CandidatePortalProfileView,
} from "../candidatePortalTypes";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class CandidatePortalServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "CANDIDATE_PORTAL_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "CandidatePortalServiceError";
    this.status = status;
    this.code = code;
  }
}

interface CandidatePortalInput {
  name: string;
  phone: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: EducationItem[];
}

interface ResolvedCandidate {
  candidateId: string;
  candidateData: DocumentData;
}

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const APPLICATION_STAGES:
  readonly ApplicationStage[] = [
    "NEW",
    "REVIEWING",
    "CONTACTED",
    "RECOMMEND_PENDING",
    "RECOMMENDED",
    "DOCUMENT_SCREEN",
    "INTERVIEW",
    "OFFER",
    "HIRED",
    "HOLD",
    "REJECTED",
    "CANCELED",
  ];

const INTERVIEW_METHODS =
  new Set([
    "ONSITE",
    "VIDEO",
    "PHONE",
  ] as const);

const RESERVED_FIELDS = [
  "candidateId",
  "authUid",
  "email",
  "source",
  "accountStatus",
  "organizationId",
  "createdBy",
  "createdAt",
  "updatedAt",
  "profileCompleteness",
] as const;

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

function sanitizeRequiredString(
  value: unknown,
  label: string,
  maxLength: number,
  code: string
): string {
  if (typeof value !== "string") {
    throw new CandidatePortalServiceError(
      `${label} 정보가 필요합니다.`,
      400,
      code
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new CandidatePortalServiceError(
      `${label} 정보가 필요합니다.`,
      400,
      code
    );
  }

  if (normalized.length > maxLength) {
    throw new CandidatePortalServiceError(
      `${label} 정보가 너무 깁니다.`,
      400,
      `${code}_TOO_LONG`
    );
  }

  return normalized;
}

function sanitizeOptionalString(
  value: unknown,
  maxLength: number,
  label: string
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (typeof value !== "string") {
    throw new CandidatePortalServiceError(
      `${label} 형식이 올바르지 않습니다.`,
      400,
      "INVALID_PROFILE_FIELD"
    );
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new CandidatePortalServiceError(
      `${label} 정보가 너무 깁니다.`,
      400,
      "PROFILE_FIELD_TOO_LONG"
    );
  }

  return normalized;
}

function normalizeSkills(
  value: unknown
): string[] {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new CandidatePortalServiceError(
      "스킬 정보 형식이 올바르지 않습니다.",
      400,
      "INVALID_SKILLS"
    );
  }

  return Array.from(
    new Set(
      value.map((item) => {
        if (typeof item !== "string") {
          throw new CandidatePortalServiceError(
            "스킬에는 문자열만 입력할 수 있습니다.",
            400,
            "INVALID_SKILLS"
          );
        }

        const normalized = item.trim();

        if (normalized.length > 100) {
          throw new CandidatePortalServiceError(
            "개별 스킬은 100자를 초과할 수 없습니다.",
            400,
            "SKILL_TOO_LONG"
          );
        }

        return normalized;
      }).filter(Boolean)
    )
  ).slice(0, 20);
}

function normalizeCareers(
  value: unknown
): CareerItem[] {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new CandidatePortalServiceError(
      "경력 정보 형식이 올바르지 않습니다.",
      400,
      "INVALID_CAREERS"
    );
  }

  return value.map((item): CareerItem => {
    if (!isRecord(item)) {
      throw new CandidatePortalServiceError(
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
  }).slice(0, 30);
}

function normalizeEducation(
  value: unknown
): EducationItem[] {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new CandidatePortalServiceError(
      "학력 정보 형식이 올바르지 않습니다.",
      400,
      "INVALID_EDUCATION"
    );
  }

  return value.map((item): EducationItem => {
    if (!isRecord(item)) {
      throw new CandidatePortalServiceError(
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
      ...(major ? { major } : {}),
      ...(degree ? { degree } : {}),
      ...(period ? { period } : {}),
    };
  }).slice(0, 20);
}

function normalizePortalInput(
  rawInput: unknown
): CandidatePortalInput {
  if (!isRecord(rawInput)) {
    throw new CandidatePortalServiceError(
      "프로필 데이터 형식이 올바르지 않습니다.",
      400,
      "INVALID_PROFILE_BODY"
    );
  }

  const reservedField =
    RESERVED_FIELDS.find((field) =>
      Object.prototype.hasOwnProperty.call(
        rawInput,
        field
      )
    );

  if (reservedField) {
    throw new CandidatePortalServiceError(
      `${reservedField} 필드는 서버에서 결정합니다.`,
      400,
      "FORBIDDEN_SERVER_FIELD"
    );
  }

  return {
    name:
      sanitizeRequiredString(
        rawInput.name,
        "이름",
        100,
        "NAME_REQUIRED"
      ),
    phone:
      sanitizeRequiredString(
        rawInput.phone,
        "연락처",
        50,
        "PHONE_REQUIRED"
      ),
    headline:
      sanitizeOptionalString(
        rawInput.headline,
        200,
        "프로필 헤드라인"
      ),
    careerSummary:
      sanitizeOptionalString(
        rawInput.careerSummary,
        3_000,
        "경력 요약"
      ),
    skills:
      normalizeSkills(rawInput.skills),
    careers:
      normalizeCareers(rawInput.careers),
    education:
      normalizeEducation(rawInput.education),
  };
}

function calculateProfileCompleteness(
  input: CandidatePortalInput,
  email: string
): number {
  let score = 0;

  if (input.name) score += 10;
  if (input.phone) score += 10;
  if (email) score += 10;
  if (input.headline) score += 10;
  if (input.careerSummary) score += 15;
  if (input.skills.length > 0) score += 15;
  if (input.careers.length > 0) score += 20;
  if (input.education.length > 0) score += 10;

  return Math.min(score, 100);
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

function isApplicationStage(
  value: unknown
): value is ApplicationStage {
  return APPLICATION_STAGES.includes(
    value as ApplicationStage
  );
}

function normalizeAuthenticatedEmail(
  value: unknown
): string {
  if (typeof value !== "string") {
    throw new CandidatePortalServiceError(
      "로그인 계정의 이메일을 확인할 수 없습니다.",
      409,
      "AUTH_EMAIL_MISSING"
    );
  }

  const email = value.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw new CandidatePortalServiceError(
      "로그인 계정의 이메일 형식이 올바르지 않습니다.",
      409,
      "AUTH_EMAIL_INVALID"
    );
  }

  return email;
}

function requireCandidateIdentity(
  authUid: string,
  candidateId: string,
  data: DocumentData
): void {
  if (data.authUid !== authUid) {
    throw new CandidatePortalServiceError(
      "로그인 계정과 Candidate 연결 정보가 일치하지 않습니다.",
      403,
      "CANDIDATE_OWNERSHIP_MISMATCH"
    );
  }

  if (
    isNonEmptyString(data.candidateId) &&
    data.candidateId.trim() !== candidateId
  ) {
    throw new CandidatePortalServiceError(
      "Candidate 식별자 데이터가 올바르지 않습니다.",
      409,
      "CANDIDATE_ID_MISMATCH"
    );
  }

  if (data.accountStatus !== "ACTIVE") {
    throw new CandidatePortalServiceError(
      "현재 사용할 수 없는 Candidate 계정입니다.",
      403,
      "CANDIDATE_NOT_ACTIVE"
    );
  }
}

async function resolveCandidateByAuthUid(
  authUid: string
): Promise<ResolvedCandidate> {
  const db = getFirebaseAdminDb();
  const linkRef =
    db.collection("candidateAuthLinks").doc(authUid);
  const linkSnapshot = await linkRef.get();

  if (linkSnapshot.exists) {
    const linkedCandidateId =
      linkSnapshot.data()?.candidateId;

    if (!isNonEmptyString(linkedCandidateId)) {
      throw new CandidatePortalServiceError(
        "Candidate 연결 정보가 손상되어 있습니다.",
        409,
        "CANDIDATE_AUTH_LINK_INVALID"
      );
    }

    const candidateSnapshot =
      await db
        .collection("candidates")
        .doc(linkedCandidateId.trim())
        .get();

    if (!candidateSnapshot.exists) {
      throw new CandidatePortalServiceError(
        "Candidate 연결 대상이 존재하지 않습니다.",
        409,
        "CANDIDATE_AUTH_LINK_BROKEN"
      );
    }

    const candidateData =
      candidateSnapshot.data();

    if (!candidateData) {
      throw new CandidatePortalServiceError(
        "Candidate 데이터가 비어 있습니다.",
        409,
        "CANDIDATE_DATA_MISSING"
      );
    }

    requireCandidateIdentity(
      authUid,
      candidateSnapshot.id,
      candidateData
    );

    return {
      candidateId: candidateSnapshot.id,
      candidateData,
    };
  }

  const snapshot = await db
    .collection("candidates")
    .where("authUid", "==", authUid)
    .limit(2)
    .get();

  if (snapshot.empty) {
    throw new CandidatePortalServiceError(
      "로그인 계정과 연결된 Candidate 프로필이 없습니다.",
      404,
      "CANDIDATE_NOT_FOUND"
    );
  }

  if (snapshot.size > 1) {
    throw new CandidatePortalServiceError(
      "하나의 로그인 계정에 여러 Candidate가 연결되어 있습니다.",
      409,
      "DUPLICATE_AUTH_CANDIDATE"
    );
  }

  const candidateSnapshot = snapshot.docs[0];
  const candidateData = candidateSnapshot.data();

  requireCandidateIdentity(
    authUid,
    candidateSnapshot.id,
    candidateData
  );

  try {
    await linkRef.set(
      {
        authUid,
        candidateId: candidateSnapshot.id,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );
  } catch (error) {
    console.error(
      "Candidate auth link self-heal failed:",
      error
    );
  }

  return {
    candidateId: candidateSnapshot.id,
    candidateData,
  };
}

async function buildCandidatePortalProfileView(
  resolved: ResolvedCandidate
): Promise<CandidatePortalProfileView> {
  const db = getFirebaseAdminDb();
  const profileSnapshot = await db
    .collection("profile")
    .doc(resolved.candidateId)
    .get();
  const profileData =
    profileSnapshot.data() || {};
  const candidate =
    resolved.candidateData;

  return {
    candidateId: resolved.candidateId,
    name:
      isNonEmptyString(candidate.name)
        ? candidate.name.trim()
        : "",
    phone:
      isNonEmptyString(candidate.phone)
        ? candidate.phone.trim()
        : "",
    email:
      isNonEmptyString(candidate.email)
        ? candidate.email.trim().toLowerCase()
        : "",
    headline:
      typeof profileData.headline === "string"
        ? profileData.headline.trim()
        : "",
    careerSummary:
      typeof profileData.careerSummary === "string"
        ? profileData.careerSummary.trim()
        : "",
    skills:
      Array.isArray(profileData.skills)
        ? profileData.skills.filter(
            (item: unknown): item is string =>
              typeof item === "string" &&
              item.trim().length > 0
          ).map((item: string) => item.trim())
        : [],
    careers:
      Array.isArray(profileData.careers)
        ? (profileData.careers as CareerItem[])
        : [],
    education:
      Array.isArray(profileData.education)
        ? (profileData.education as EducationItem[])
        : [],
    profileCompleteness:
      typeof profileData.profileCompleteness === "number"
        ? Math.max(
            0,
            Math.min(
              100,
              Math.floor(profileData.profileCompleteness)
            )
          )
        : 0,
    createdAt:
      timestampToIsoString(candidate.createdAt),
    updatedAt:
      timestampToIsoString(
        profileData.updatedAt ||
        candidate.updatedAt
      ),
  };
}

export async function bootstrapCandidatePortalProfile(
  authUid: string,
  authenticatedEmail: unknown,
  rawInput: unknown
): Promise<CandidatePortalBootstrapResult> {
  const email =
    normalizeAuthenticatedEmail(
      authenticatedEmail
    );
  const input =
    normalizePortalInput(rawInput);
  const db = getFirebaseAdminDb();

  const legacyCandidates = await db
    .collection("candidates")
    .where("authUid", "==", authUid)
    .limit(2)
    .get();

  if (legacyCandidates.size > 1) {
    throw new CandidatePortalServiceError(
      "하나의 로그인 계정에 여러 Candidate가 연결되어 있습니다.",
      409,
      "DUPLICATE_AUTH_CANDIDATE"
    );
  }

  if (legacyCandidates.size === 1) {
    const profile =
      await getCandidatePortalProfile(authUid);

    return {
      created: false,
      profile,
    };
  }

  const candidateRef =
    db.collection("candidates").doc();
  const profileRef =
    db.collection("profile").doc(candidateRef.id);
  const linkRef =
    db.collection("candidateAuthLinks").doc(authUid);
  const profileCompleteness =
    calculateProfileCompleteness(
      input,
      email
    );

  const created = await db.runTransaction(
    async (transaction): Promise<boolean> => {
      const linkSnapshot =
        await transaction.get(linkRef);

      if (linkSnapshot.exists) {
        return false;
      }

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.set(
        candidateRef,
        {
          candidateId: candidateRef.id,
          authUid,
          name: input.name,
          phone: input.phone,
          email,
          source: "B2C_SELF",
          accountStatus: "ACTIVE",
          createdAt: serverTimestamp,
          updatedAt: serverTimestamp,
        }
      );

      transaction.set(
        profileRef,
        {
          candidateId: candidateRef.id,
          headline: input.headline,
          careerSummary: input.careerSummary,
          skills: input.skills,
          careers: input.careers,
          education: input.education,
          profileCompleteness,
          updatedAt: serverTimestamp,
        }
      );

      transaction.set(
        linkRef,
        {
          authUid,
          candidateId: candidateRef.id,
          createdAt: serverTimestamp,
          updatedAt: serverTimestamp,
        }
      );

      return true;
    }
  );

  const profile =
    await getCandidatePortalProfile(authUid);

  return {
    created,
    profile,
  };
}

export async function getCandidatePortalProfile(
  authUid: string
): Promise<CandidatePortalProfileView> {
  const resolved =
    await resolveCandidateByAuthUid(authUid);

  return buildCandidatePortalProfileView(
    resolved
  );
}

export async function updateCandidatePortalProfile(
  authUid: string,
  rawInput: unknown
): Promise<CandidatePortalProfileView> {
  const input =
    normalizePortalInput(rawInput);
  const resolved =
    await resolveCandidateByAuthUid(authUid);
  const email =
    normalizeAuthenticatedEmail(
      resolved.candidateData.email
    );
  const db = getFirebaseAdminDb();
  const candidateRef =
    db.collection("candidates").doc(
      resolved.candidateId
    );
  const profileRef =
    db.collection("profile").doc(
      resolved.candidateId
    );
  const profileCompleteness =
    calculateProfileCompleteness(
      input,
      email
    );

  await db.runTransaction(
    async (transaction) => {
      const candidateSnapshot =
        await transaction.get(candidateRef);

      if (!candidateSnapshot.exists) {
        throw new CandidatePortalServiceError(
          "Candidate 프로필이 존재하지 않습니다.",
          404,
          "CANDIDATE_NOT_FOUND"
        );
      }

      const candidateData =
        candidateSnapshot.data();

      if (!candidateData) {
        throw new CandidatePortalServiceError(
          "Candidate 데이터가 비어 있습니다.",
          409,
          "CANDIDATE_DATA_MISSING"
        );
      }

      requireCandidateIdentity(
        authUid,
        resolved.candidateId,
        candidateData
      );

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.update(
        candidateRef,
        {
          name: input.name,
          phone: input.phone,
          updatedAt: serverTimestamp,
        }
      );

      transaction.set(
        profileRef,
        {
          candidateId: resolved.candidateId,
          headline: input.headline,
          careerSummary: input.careerSummary,
          skills: input.skills,
          careers: input.careers,
          education: input.education,
          profileCompleteness,
          updatedAt: serverTimestamp,
        }
      );
    }
  );

  const applicationsSnapshot = await db
    .collection("applications")
    .where(
      "candidateId",
      "==",
      resolved.candidateId
    )
    .get();

  const documents = applicationsSnapshot.docs;

  for (
    let offset = 0;
    offset < documents.length;
    offset += 200
  ) {
    const batch = db.batch();
    const chunk = documents.slice(
      offset,
      offset + 200
    );

    for (const applicationDocument of chunk) {
      const applicationData =
        applicationDocument.data();
      const serverTimestamp =
        FieldValue.serverTimestamp();

      batch.update(
        applicationDocument.ref,
        {
          candidateSnapshot: {
            name: input.name,
            phone: input.phone,
            email,
          },
          updatedAt: serverTimestamp,
          lastActivityAt: serverTimestamp,
        }
      );

      if (
        isNonEmptyString(
          applicationData.organizationId
        )
      ) {
        const eventRef =
          db.collection("appEvents").doc();

        batch.set(
          eventRef,
          {
            eventId: eventRef.id,
            applicationId:
              applicationDocument.id,
            organizationId:
              applicationData.organizationId.trim(),
            type:
              "PROFILE_UPDATED" satisfies EventType,
            changedBy: authUid,
            note:
              "지원자가 Candidate Portal에서 프로필을 수정했습니다.",
            metadata: {
              source: "B2C_SELF_SERVICE",
              candidateId:
                resolved.candidateId,
            },
            createdAt: serverTimestamp,
          }
        );
      }
    }

    await batch.commit();
  }

  return getCandidatePortalProfile(authUid);
}

function toCandidatePortalInterview(
  interviewId: string,
  data: DocumentData
): CandidatePortalInterviewView | null {
  if (
    data.status !== "SCHEDULED" ||
    !INTERVIEW_METHODS.has(
      data.method as
        | "ONSITE"
        | "VIDEO"
        | "PHONE"
    )
  ) {
    return null;
  }

  const scheduledAt =
    timestampToIsoString(data.scheduledAt);

  if (
    !scheduledAt ||
    Date.parse(scheduledAt) <
      Date.now() - 5 * 60 * 1000
  ) {
    return null;
  }

  return {
    interviewId,
    scheduledAt,
    method:
      data.method as
        | "ONSITE"
        | "VIDEO"
        | "PHONE",
    location:
      isNonEmptyString(data.location)
        ? data.location.trim()
        : null,
    interviewer:
      isNonEmptyString(data.interviewer)
        ? data.interviewer.trim()
        : null,
  };
}

export async function listCandidatePortalApplications(
  authUid: string
): Promise<CandidatePortalApplicationView[]> {
  const resolved =
    await resolveCandidateByAuthUid(authUid);
  const db = getFirebaseAdminDb();

  const [
    applicationsSnapshot,
    interviewsSnapshot,
  ] = await Promise.all([
    db
      .collection("applications")
      .where(
        "candidateId",
        "==",
        resolved.candidateId
      )
      .get(),
    db
      .collection("interviews")
      .where(
        "candidateId",
        "==",
        resolved.candidateId
      )
      .get(),
  ]);

  const nextInterviewByApplication =
    new Map<
      string,
      CandidatePortalInterviewView
    >();

  for (const interviewDocument of interviewsSnapshot.docs) {
    const data = interviewDocument.data();

    if (!isNonEmptyString(data.applicationId)) {
      continue;
    }

    const interview =
      toCandidatePortalInterview(
        interviewDocument.id,
        data
      );

    if (!interview) {
      continue;
    }

    const applicationId =
      data.applicationId.trim();
    const current =
      nextInterviewByApplication.get(
        applicationId
      );

    if (
      !current ||
      Date.parse(interview.scheduledAt) <
        Date.parse(current.scheduledAt)
    ) {
      nextInterviewByApplication.set(
        applicationId,
        interview
      );
    }
  }

  const jobIds = Array.from(
    new Set(
      applicationsSnapshot.docs
        .map((document) =>
          document.data().jobId
        )
        .filter(isNonEmptyString)
        .map((jobId) => jobId.trim())
    )
  );

  const jobSnapshots = await Promise.all(
    jobIds.map((jobId) =>
      db.collection("jobs").doc(jobId).get()
    )
  );
  const jobsById = new Map(
    jobSnapshots.map((snapshot) => [
      snapshot.id,
      snapshot.exists
        ? snapshot.data() || null
        : null,
    ])
  );

  return applicationsSnapshot.docs
    .map((document): CandidatePortalApplicationView | null => {
      const data = document.data();

      if (!isApplicationStage(data.stage)) {
        return null;
      }

      const jobId =
        isNonEmptyString(data.jobId)
          ? data.jobId.trim()
          : "";
      const jobData =
        jobsById.get(jobId) || null;
      const snapshotJob =
        isRecord(data.jobSnapshot)
          ? data.jobSnapshot
          : {};

      const jobTitle =
        isNonEmptyString(jobData?.title)
          ? jobData.title.trim()
          : isNonEmptyString(snapshotJob.title)
            ? snapshotJob.title.trim()
            : "채용 포지션";

      const company =
        isNonEmptyString(jobData?.displayCompany)
          ? jobData.displayCompany.trim()
          : isNonEmptyString(jobData?.company)
            ? jobData.company.trim()
            : "채용 고객사";

      const hiringOutcome =
        isRecord(data.hiringOutcome)
          ? data.hiringOutcome
          : null;
      const plannedStartDate =
        data.stage === "HIRED" &&
        hiringOutcome?.status === "HIRED" &&
        typeof hiringOutcome.plannedStartDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(
          hiringOutcome.plannedStartDate
        )
          ? hiringOutcome.plannedStartDate
          : null;

      return {
        applicationId: document.id,
        jobId,
        stage: data.stage,
        jobTitle,
        company,
        appliedAt:
          timestampToIsoString(data.appliedAt),
        updatedAt:
          timestampToIsoString(data.updatedAt),
        lastActivityAt:
          timestampToIsoString(
            data.lastActivityAt
          ),
        nextInterview:
          nextInterviewByApplication.get(
            document.id
          ) || null,
        plannedStartDate,
      };
    })
    .filter(
      (
        item
      ): item is CandidatePortalApplicationView =>
        item !== null
    )
    .sort((a, b) => {
      const aTime = a.appliedAt
        ? Date.parse(a.appliedAt)
        : 0;
      const bTime = b.appliedAt
        ? Date.parse(b.appliedAt)
        : 0;

      return bTime - aTime;
    });
}
