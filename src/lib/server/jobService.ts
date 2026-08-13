import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import type {
  JobStatus,
} from "../../types";

import {
  requireB2BActor,
  type B2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class JobServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "JOB_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "JobServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface B2BJobView {
  jobId: string;
  organizationId: string;
  company: string;
  displayCompany: string;
  title: string;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  salary: string;
  location: string;
  employmentType: string;
  status: JobStatus;
  recruiterId: string;
  createdAt: string | null;
  updatedAt: string | null;
}

const JOB_STATUSES: readonly JobStatus[] = [
  "OPEN",
  "CLOSED",
  "DRAFT",
];

const CREATE_STATUSES: readonly JobStatus[] = [
  "OPEN",
  "DRAFT",
];

const RESERVED_JOB_FIELDS = [
  "jobId",
  "recruiterId",
  "createdAt",
  "updatedAt",
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
  if (!isNonEmptyString(value)) {
    throw new JobServiceError(
      `${label} 정보가 필요합니다.`,
      400,
      code
    );
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new JobServiceError(
      `${label} 정보가 너무 깁니다.`,
      400,
      `${code}_TOO_LONG`
    );
  }

  return normalized;
}

function sanitizeStringArray(
  value: unknown,
  label: string,
  maxItems = 30
): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new JobServiceError(
      `${label}은(는) 문자열 배열이어야 합니다.`,
      400,
      "INVALID_JOB_LIST_FIELD"
    );
  }

  const normalized = value
    .map((item) => {
      if (typeof item !== "string") {
        throw new JobServiceError(
          `${label}에는 문자열만 입력할 수 있습니다.`,
          400,
          "INVALID_JOB_LIST_FIELD"
        );
      }

      const text = item.trim();

      if (text.length > 500) {
        throw new JobServiceError(
          `${label}의 개별 항목은 500자를 초과할 수 없습니다.`,
          400,
          "JOB_LIST_ITEM_TOO_LONG"
        );
      }

      return text;
    })
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(0, maxItems);
}

function parseStatus(
  value: unknown,
  allowed: readonly JobStatus[]
): JobStatus {
  if (!JOB_STATUSES.includes(value as JobStatus)) {
    throw new JobServiceError(
      "올바르지 않은 공고 상태입니다.",
      400,
      "INVALID_JOB_STATUS"
    );
  }

  const status = value as JobStatus;

  if (!allowed.includes(status)) {
    throw new JobServiceError(
      "해당 상태로 공고를 생성할 수 없습니다.",
      400,
      "INVALID_INITIAL_JOB_STATUS"
    );
  }

  return status;
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

function toJobView(
  documentId: string,
  data: DocumentData
): B2BJobView {
  const status = data.status as JobStatus;

  if (!JOB_STATUSES.includes(status)) {
    throw new JobServiceError(
      "공고 상태 데이터가 올바르지 않습니다.",
      409,
      "INVALID_EXISTING_JOB_STATUS"
    );
  }

  const company = sanitizeRequiredString(
    data.company,
    "기업명",
    200,
    "JOB_COMPANY_MISSING"
  );

  return {
    jobId: isNonEmptyString(data.jobId)
      ? data.jobId.trim()
      : documentId,
    organizationId: sanitizeRequiredString(
      data.organizationId,
      "조직",
      200,
      "JOB_ORGANIZATION_MISSING"
    ),
    company,
    displayCompany: isNonEmptyString(data.displayCompany)
      ? data.displayCompany.trim()
      : company,
    title: sanitizeRequiredString(
      data.title,
      "공고명",
      300,
      "JOB_TITLE_MISSING"
    ),
    description:
      typeof data.description === "string"
        ? data.description
        : "",
    requirements: Array.isArray(data.requirements)
      ? data.requirements.filter(
          (item: unknown): item is string =>
            typeof item === "string"
        )
      : [],
    preferredQualifications:
      Array.isArray(data.preferredQualifications)
        ? data.preferredQualifications.filter(
            (item: unknown): item is string =>
              typeof item === "string"
          )
        : [],
    salary:
      typeof data.salary === "string"
        ? data.salary
        : "",
    location:
      typeof data.location === "string"
        ? data.location
        : "",
    employmentType:
      typeof data.employmentType === "string"
        ? data.employmentType
        : "",
    status,
    recruiterId: sanitizeRequiredString(
      data.recruiterId,
      "담당자",
      200,
      "JOB_RECRUITER_MISSING"
    ),
    createdAt: timestampToIsoString(data.createdAt),
    updatedAt: timestampToIsoString(data.updatedAt),
  };
}

function assertTenantAccess(
  actor: B2BActor,
  organizationId: string
): void {
  if (
    actor.role === "RECRUITER" &&
    actor.organizationId !== organizationId
  ) {
    throw new JobServiceError(
      "다른 조직의 공고를 관리할 수 없습니다.",
      403,
      "TENANT_ACCESS_DENIED"
    );
  }
}

async function requireActiveOrganization(
  organizationId: string
): Promise<void> {
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("organizations")
    .doc(organizationId)
    .get();

  if (!snapshot.exists) {
    throw new JobServiceError(
      "존재하지 않는 조직입니다.",
      404,
      "ORGANIZATION_NOT_FOUND"
    );
  }

  if (snapshot.data()?.status !== "ACTIVE") {
    throw new JobServiceError(
      "활성 상태의 조직에서만 공고를 관리할 수 있습니다.",
      403,
      "ORGANIZATION_NOT_ACTIVE"
    );
  }
}

function resolveCreateOrganizationId(
  actor: B2BActor,
  body: Record<string, unknown>
): string {
  if (actor.role === "RECRUITER") {
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "organizationId"
      )
    ) {
      throw new JobServiceError(
        "organizationId는 서버에서 결정합니다.",
        400,
        "FORBIDDEN_ORGANIZATION_OVERRIDE"
      );
    }

    if (!actor.organizationId) {
      throw new JobServiceError(
        "리쿠르터 조직 정보가 없습니다.",
        403,
        "RECRUITER_ORGANIZATION_MISSING"
      );
    }

    return actor.organizationId;
  }

  return sanitizeRequiredString(
    body.organizationId,
    "조직 ID",
    200,
    "ORGANIZATION_ID_REQUIRED"
  );
}

function normalizeCreateInput(
  rawInput: unknown,
  actor: B2BActor
) {
  if (!isRecord(rawInput)) {
    throw new JobServiceError(
      "공고 데이터 형식이 올바르지 않습니다.",
      400,
      "INVALID_JOB_BODY"
    );
  }

  const reservedField = RESERVED_JOB_FIELDS.find(
    (field) =>
      Object.prototype.hasOwnProperty.call(
        rawInput,
        field
      )
  );

  if (reservedField) {
    throw new JobServiceError(
      `${reservedField} 필드는 서버에서 결정합니다.`,
      400,
      "FORBIDDEN_SERVER_FIELD"
    );
  }

  const organizationId =
    resolveCreateOrganizationId(actor, rawInput);

  const company = sanitizeRequiredString(
    rawInput.company,
    "기업명",
    200,
    "COMPANY_REQUIRED"
  );

  return {
    organizationId,
    company,
    displayCompany: isNonEmptyString(rawInput.displayCompany)
      ? rawInput.displayCompany.trim()
      : company,
    title: sanitizeRequiredString(
      rawInput.title,
      "공고명",
      300,
      "TITLE_REQUIRED"
    ),
    description: sanitizeRequiredString(
      rawInput.description,
      "공고 설명",
      10_000,
      "DESCRIPTION_REQUIRED"
    ),
    requirements: sanitizeStringArray(
      rawInput.requirements,
      "필수 요건"
    ),
    preferredQualifications: sanitizeStringArray(
      rawInput.preferredQualifications,
      "우대 사항"
    ),
    salary: sanitizeRequiredString(
      rawInput.salary,
      "급여",
      200,
      "SALARY_REQUIRED"
    ),
    location: sanitizeRequiredString(
      rawInput.location,
      "근무지",
      300,
      "LOCATION_REQUIRED"
    ),
    employmentType: sanitizeRequiredString(
      rawInput.employmentType,
      "고용 형태",
      100,
      "EMPLOYMENT_TYPE_REQUIRED"
    ),
    status: parseStatus(
      rawInput.status ?? "DRAFT",
      CREATE_STATUSES
    ),
  };
}

function normalizeUpdateInput(
  rawInput: unknown
): Partial<Omit<
  B2BJobView,
  | "jobId"
  | "organizationId"
  | "recruiterId"
  | "createdAt"
  | "updatedAt"
>> {
  if (!isRecord(rawInput)) {
    throw new JobServiceError(
      "공고 수정 데이터 형식이 올바르지 않습니다.",
      400,
      "INVALID_JOB_BODY"
    );
  }

  const forbiddenFields = [
    ...RESERVED_JOB_FIELDS,
    "organizationId",
  ];

  const forbiddenField = forbiddenFields.find(
    (field) =>
      Object.prototype.hasOwnProperty.call(
        rawInput,
        field
      )
  );

  if (forbiddenField) {
    throw new JobServiceError(
      `${forbiddenField} 필드는 변경할 수 없습니다.`,
      400,
      "FORBIDDEN_JOB_FIELD"
    );
  }

  const update: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(rawInput, "company")) {
    update.company = sanitizeRequiredString(
      rawInput.company,
      "기업명",
      200,
      "COMPANY_REQUIRED"
    );
  }

  if (Object.prototype.hasOwnProperty.call(rawInput, "displayCompany")) {
    update.displayCompany = sanitizeRequiredString(
      rawInput.displayCompany,
      "노출 기업명",
      200,
      "DISPLAY_COMPANY_REQUIRED"
    );
  }

  if (Object.prototype.hasOwnProperty.call(rawInput, "title")) {
    update.title = sanitizeRequiredString(
      rawInput.title,
      "공고명",
      300,
      "TITLE_REQUIRED"
    );
  }

  if (Object.prototype.hasOwnProperty.call(rawInput, "description")) {
    update.description = sanitizeRequiredString(
      rawInput.description,
      "공고 설명",
      10_000,
      "DESCRIPTION_REQUIRED"
    );
  }

  if (Object.prototype.hasOwnProperty.call(rawInput, "requirements")) {
    update.requirements = sanitizeStringArray(
      rawInput.requirements,
      "필수 요건"
    );
  }

  if (Object.prototype.hasOwnProperty.call(rawInput, "preferredQualifications")) {
    update.preferredQualifications = sanitizeStringArray(
      rawInput.preferredQualifications,
      "우대 사항"
    );
  }

  if (Object.prototype.hasOwnProperty.call(rawInput, "salary")) {
    update.salary = sanitizeRequiredString(
      rawInput.salary,
      "급여",
      200,
      "SALARY_REQUIRED"
    );
  }

  if (Object.prototype.hasOwnProperty.call(rawInput, "location")) {
    update.location = sanitizeRequiredString(
      rawInput.location,
      "근무지",
      300,
      "LOCATION_REQUIRED"
    );
  }

  if (Object.prototype.hasOwnProperty.call(rawInput, "employmentType")) {
    update.employmentType = sanitizeRequiredString(
      rawInput.employmentType,
      "고용 형태",
      100,
      "EMPLOYMENT_TYPE_REQUIRED"
    );
  }

  if (Object.prototype.hasOwnProperty.call(rawInput, "status")) {
    update.status = parseStatus(
      rawInput.status,
      JOB_STATUSES
    );
  }

  if (Object.keys(update).length === 0) {
    throw new JobServiceError(
      "수정할 공고 정보가 없습니다.",
      400,
      "NO_JOB_CHANGES"
    );
  }

  return update as Partial<Omit<
    B2BJobView,
    | "jobId"
    | "organizationId"
    | "recruiterId"
    | "createdAt"
    | "updatedAt"
  >>;
}

export async function listB2BJobs(
  actorUid: string
): Promise<B2BJobView[]> {
  const actor = await requireB2BActor(actorUid);
  const db = getFirebaseAdminDb();
  const jobsReference = db.collection("jobs");

  const snapshot = actor.role === "ADMIN"
    ? await jobsReference.get()
    : await jobsReference
        .where(
          "organizationId",
          "==",
          actor.organizationId
        )
        .get();

  return snapshot.docs
    .map((document) =>
      toJobView(
        document.id,
        document.data()
      )
    )
    .sort((a, b) => {
      const aTime = a.updatedAt
        ? Date.parse(a.updatedAt)
        : 0;
      const bTime = b.updatedAt
        ? Date.parse(b.updatedAt)
        : 0;
      return bTime - aTime;
    });
}

export async function createB2BJob(
  actorUid: string,
  rawInput: unknown
): Promise<B2BJobView> {
  const actor = await requireB2BActor(actorUid);
  const input = normalizeCreateInput(rawInput, actor);

  await requireActiveOrganization(
    input.organizationId
  );

  const db = getFirebaseAdminDb();
  const jobReference = db.collection("jobs").doc();
  const jobId = jobReference.id;
  const serverTimestamp = FieldValue.serverTimestamp();

  await jobReference.set({
    jobId,
    organizationId: input.organizationId,
    company: input.company,
    displayCompany: input.displayCompany,
    title: input.title,
    description: input.description,
    requirements: input.requirements,
    preferredQualifications: input.preferredQualifications,
    salary: input.salary,
    location: input.location,
    employmentType: input.employmentType,
    status: input.status,
    recruiterId: actor.uid,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  });

  const createdSnapshot = await jobReference.get();
  const createdData = createdSnapshot.data();

  if (!createdData) {
    throw new JobServiceError(
      "공고 생성 결과를 확인할 수 없습니다.",
      500,
      "JOB_CREATE_READBACK_FAILED"
    );
  }

  return toJobView(jobId, createdData);
}

export async function updateB2BJob(
  actorUid: string,
  jobIdInput: string,
  rawInput: unknown
): Promise<B2BJobView> {
  const actor = await requireB2BActor(actorUid);
  const jobId = jobIdInput.trim();

  if (!jobId) {
    throw new JobServiceError(
      "공고 ID가 필요합니다.",
      400,
      "JOB_ID_REQUIRED"
    );
  }

  const update = normalizeUpdateInput(rawInput);
  const db = getFirebaseAdminDb();
  const jobReference = db.collection("jobs").doc(jobId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobReference);

    if (!snapshot.exists) {
      throw new JobServiceError(
        "존재하지 않는 공고입니다.",
        404,
        "JOB_NOT_FOUND"
      );
    }

    const data = snapshot.data();

    if (!data) {
      throw new JobServiceError(
        "공고 데이터가 비어 있습니다.",
        409,
        "JOB_DATA_MISSING"
      );
    }

    const organizationId = sanitizeRequiredString(
      data.organizationId,
      "조직",
      200,
      "JOB_ORGANIZATION_MISSING"
    );

    assertTenantAccess(actor, organizationId);

    transaction.update(jobReference, {
      ...update,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  const updatedSnapshot = await jobReference.get();
  const updatedData = updatedSnapshot.data();

  if (!updatedData) {
    throw new JobServiceError(
      "공고 수정 결과를 확인할 수 없습니다.",
      500,
      "JOB_UPDATE_READBACK_FAILED"
    );
  }

  return toJobView(jobId, updatedData);
}
