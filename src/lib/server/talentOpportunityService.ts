import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import type { ApplicationStage } from "../../types";
import type {
  TalentOpportunityStatus,
  TalentOpportunityView,
} from "../talentOpportunityTypes";
import {
  CandidatePortalServiceError,
  getCandidatePortalProfile,
} from "./candidatePortalService";
import {
  requireB2BActor,
} from "./b2bAuthorization";
import { getFirebaseAdminDb } from "./firebaseAdmin";

export class TalentOpportunityServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "TALENT_OPPORTUNITY_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "TalentOpportunityServiceError";
    this.status = status;
    this.code = code;
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function requiredString(
  data: DocumentData,
  key: string,
  code: string
): string {
  const value = stringValue(data[key]);
  if (!value) {
    throw new TalentOpportunityServiceError(
      `${key} 정보가 누락되어 있습니다.`,
      409,
      code
    );
  }
  return value;
}

function timestampToIso(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const timestamp = value as { toDate?: () => Date };
  if (typeof timestamp.toDate !== "function") return null;
  try {
    return timestamp.toDate().toISOString();
  } catch {
    return null;
  }
}

function statusValue(value: unknown): TalentOpportunityStatus {
  if (value === "DECLINED" || value === "CONVERTED") return value;
  return "PROPOSED";
}

function toView(
  opportunityId: string,
  data: DocumentData
): TalentOpportunityView {
  const jobSnapshot =
    typeof data.jobSnapshot === "object" && data.jobSnapshot !== null
      ? data.jobSnapshot as Record<string, unknown>
      : {};

  return {
    opportunityId,
    candidateId: stringValue(data.candidateId),
    jobId: stringValue(data.jobId),
    organizationId: stringValue(data.organizationId),
    recruiterId: stringValue(data.recruiterId),
    status: statusValue(data.status),
    jobTitle: stringValue(jobSnapshot.title) || "채용 포지션",
    displayCompany: stringValue(jobSnapshot.displayCompany) || "The Lobby Partner",
    location: stringValue(jobSnapshot.location),
    employmentType: stringValue(jobSnapshot.employmentType),
    salary: stringValue(jobSnapshot.salary),
    note: stringValue(data.note),
    createdAt: timestampToIso(data.createdAt),
    respondedAt: timestampToIso(data.respondedAt),
  };
}

function normalizeId(value: unknown, label: string, code: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TalentOpportunityServiceError(
      `${label}가 필요합니다.`,
      400,
      code
    );
  }
  return value.trim();
}

function normalizeNote(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new TalentOpportunityServiceError(
      "제안 메모 형식이 올바르지 않습니다.",
      400,
      "INVALID_OPPORTUNITY_NOTE"
    );
  }
  const note = value.trim();
  if (note.length > 1000) {
    throw new TalentOpportunityServiceError(
      "제안 메모는 1,000자를 초과할 수 없습니다.",
      400,
      "OPPORTUNITY_NOTE_TOO_LONG"
    );
  }
  return note;
}

async function resolveCandidateId(authUid: string): Promise<string> {
  try {
    const profile = await getCandidatePortalProfile(authUid);
    return profile.candidateId;
  } catch (error) {
    if (error instanceof CandidatePortalServiceError) throw error;
    throw error;
  }
}

export async function createTalentOpportunity(
  actorUid: string,
  rawInput: unknown
): Promise<TalentOpportunityView> {
  const actor = await requireB2BActor(actorUid);
  if (actor.role !== "ADMIN") {
    throw new TalentOpportunityServiceError(
      "J&C 공개 인재풀 제안은 ADMIN 계정만 만들 수 있습니다.",
      403,
      "TALENT_OPPORTUNITY_ADMIN_REQUIRED"
    );
  }

  const input =
    typeof rawInput === "object" && rawInput !== null
      ? rawInput as Record<string, unknown>
      : {};
  const candidateId = normalizeId(
    input.candidateId,
    "후보자 ID",
    "CANDIDATE_ID_REQUIRED"
  );
  const jobId = normalizeId(input.jobId, "공고 ID", "JOB_ID_REQUIRED");
  const note = normalizeNote(input.note);
  const opportunityId = `${candidateId}__${jobId}`;
  const db = getFirebaseAdminDb();
  const candidateRef = db.collection("candidates").doc(candidateId);
  const jobRef = db.collection("jobs").doc(jobId);
  const opportunityRef = db.collection("talentOpportunities").doc(opportunityId);

  await db.runTransaction(async (transaction) => {
    const [candidateSnapshot, jobSnapshot, opportunitySnapshot] = await Promise.all([
      transaction.get(candidateRef),
      transaction.get(jobRef),
      transaction.get(opportunityRef),
    ]);

    if (!candidateSnapshot.exists) {
      throw new TalentOpportunityServiceError(
        "공개 인재풀 후보자를 찾을 수 없습니다.",
        404,
        "CANDIDATE_NOT_FOUND"
      );
    }
    if (!jobSnapshot.exists) {
      throw new TalentOpportunityServiceError(
        "채용 공고를 찾을 수 없습니다.",
        404,
        "JOB_NOT_FOUND"
      );
    }
    if (opportunitySnapshot.exists) {
      throw new TalentOpportunityServiceError(
        "이미 해당 후보자에게 같은 포지션을 제안했습니다.",
        409,
        "DUPLICATE_TALENT_OPPORTUNITY"
      );
    }

    const candidate = candidateSnapshot.data();
    const job = jobSnapshot.data();
    if (!candidate || !job) {
      throw new TalentOpportunityServiceError(
        "제안 생성에 필요한 데이터가 없습니다.",
        409,
        "OPPORTUNITY_DATA_MISSING"
      );
    }

    if (
      candidate.source !== "B2C_SELF" ||
      candidate.accountStatus !== "ACTIVE" ||
      candidate.talentPoolOptIn !== true
    ) {
      throw new TalentOpportunityServiceError(
        "현재 J&C 공개 인재풀에 동의한 활성 후보자에게만 제안할 수 있습니다.",
        409,
        "CANDIDATE_NOT_AVAILABLE_FOR_TALENT_POOL"
      );
    }
    if (job.status !== "OPEN") {
      throw new TalentOpportunityServiceError(
        "공개 중인 공고만 제안할 수 있습니다.",
        409,
        "JOB_NOT_OPEN"
      );
    }

    const organizationId = requiredString(
      job,
      "organizationId",
      "JOB_ORGANIZATION_MISSING"
    );
    const recruiterId = requiredString(
      job,
      "recruiterId",
      "JOB_RECRUITER_MISSING"
    );
    const serverTimestamp = FieldValue.serverTimestamp();

    transaction.set(opportunityRef, {
      opportunityId,
      candidateId,
      jobId,
      organizationId,
      recruiterId,
      status: "PROPOSED" satisfies TalentOpportunityStatus,
      createdBy: actor.uid,
      note,
      jobSnapshot: {
        title: requiredString(job, "title", "JOB_TITLE_MISSING"),
        displayCompany:
          stringValue(job.displayCompany) || "The Lobby Partner",
        location: stringValue(job.location),
        employmentType: stringValue(job.employmentType),
        salary: stringValue(job.salary),
      },
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
      respondedAt: null,
    });
  });

  const snapshot = await opportunityRef.get();
  return toView(opportunityId, snapshot.data() || {});
}

export async function listCandidateTalentOpportunities(
  authUid: string
): Promise<TalentOpportunityView[]> {
  const candidateId = await resolveCandidateId(authUid);
  const snapshot = await getFirebaseAdminDb()
    .collection("talentOpportunities")
    .where("candidateId", "==", candidateId)
    .get();

  return snapshot.docs
    .map((document) => toView(document.id, document.data()))
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
}

export async function respondToTalentOpportunity(
  authUid: string,
  opportunityIdInput: string,
  decisionInput: unknown
): Promise<TalentOpportunityView> {
  const candidateId = await resolveCandidateId(authUid);
  const opportunityId = normalizeId(
    opportunityIdInput,
    "제안 ID",
    "OPPORTUNITY_ID_REQUIRED"
  );
  const decision =
    decisionInput === "ACCEPT" || decisionInput === "DECLINE"
      ? decisionInput
      : null;
  if (!decision) {
    throw new TalentOpportunityServiceError(
      "제안 응답값이 올바르지 않습니다.",
      400,
      "INVALID_OPPORTUNITY_DECISION"
    );
  }

  const db = getFirebaseAdminDb();
  const opportunityRef = db.collection("talentOpportunities").doc(opportunityId);

  await db.runTransaction(async (transaction) => {
    const opportunitySnapshot = await transaction.get(opportunityRef);
    if (!opportunitySnapshot.exists) {
      throw new TalentOpportunityServiceError(
        "채용 제안을 찾을 수 없습니다.",
        404,
        "OPPORTUNITY_NOT_FOUND"
      );
    }

    const opportunity = opportunitySnapshot.data();
    if (!opportunity || opportunity.candidateId !== candidateId) {
      throw new TalentOpportunityServiceError(
        "해당 채용 제안에 응답할 권한이 없습니다.",
        403,
        "OPPORTUNITY_OWNERSHIP_MISMATCH"
      );
    }
    if (opportunity.status !== "PROPOSED") {
      throw new TalentOpportunityServiceError(
        "이미 응답이 완료된 채용 제안입니다.",
        409,
        "OPPORTUNITY_ALREADY_RESPONDED"
      );
    }

    const serverTimestamp = FieldValue.serverTimestamp();
    if (decision === "DECLINE") {
      transaction.update(opportunityRef, {
        status: "DECLINED" satisfies TalentOpportunityStatus,
        respondedAt: serverTimestamp,
        updatedAt: serverTimestamp,
      });
      return;
    }

    const candidateRef = db.collection("candidates").doc(candidateId);
    const jobId = requiredString(opportunity, "jobId", "OPPORTUNITY_JOB_MISSING");
    const jobRef = db.collection("jobs").doc(jobId);
    const applicationId = `${candidateId}__${jobId}`;
    const applicationRef = db.collection("applications").doc(applicationId);
    const eventRef = db.collection("appEvents").doc();

    const [candidateSnapshot, jobSnapshot, applicationSnapshot] = await Promise.all([
      transaction.get(candidateRef),
      transaction.get(jobRef),
      transaction.get(applicationRef),
    ]);

    if (applicationSnapshot.exists) {
      throw new TalentOpportunityServiceError(
        "이미 해당 공고의 지원 내역이 존재합니다.",
        409,
        "DUPLICATE_APPLICATION"
      );
    }
    const candidate = candidateSnapshot.data();
    const job = jobSnapshot.data();
    if (!candidateSnapshot.exists || !candidate || candidate.authUid !== authUid) {
      throw new TalentOpportunityServiceError(
        "Candidate 계정 연결 정보를 확인할 수 없습니다.",
        403,
        "CANDIDATE_OWNERSHIP_MISMATCH"
      );
    }
    if (candidate.accountStatus !== "ACTIVE") {
      throw new TalentOpportunityServiceError(
        "활성 상태의 후보자만 제안을 수락할 수 있습니다.",
        409,
        "CANDIDATE_NOT_ACTIVE"
      );
    }
    if (!jobSnapshot.exists || !job || job.status !== "OPEN") {
      throw new TalentOpportunityServiceError(
        "현재 진행할 수 없는 채용공고입니다.",
        409,
        "JOB_NOT_OPEN"
      );
    }

    const organizationId = requiredString(job, "organizationId", "JOB_ORGANIZATION_MISSING");
    const recruiterId = requiredString(job, "recruiterId", "JOB_RECRUITER_MISSING");
    const candidateName = requiredString(candidate, "name", "CANDIDATE_NAME_MISSING");
    const candidatePhone = requiredString(candidate, "phone", "CANDIDATE_PHONE_MISSING");
    const candidateEmail = requiredString(candidate, "email", "CANDIDATE_EMAIL_MISSING");
    const jobTitle = requiredString(job, "title", "JOB_TITLE_MISSING");
    const jobCompany = requiredString(job, "company", "JOB_COMPANY_MISSING");

    transaction.set(applicationRef, {
      applicationId,
      candidateId,
      jobId,
      organizationId,
      recruiterId,
      stage: "NEW" satisfies ApplicationStage,
      source: "HEADHUNTING",
      candidateSnapshot: {
        name: candidateName,
        phone: candidatePhone,
        email: candidateEmail,
      },
      jobSnapshot: {
        title: jobTitle,
        company: jobCompany,
      },
      appliedAt: serverTimestamp,
      updatedAt: serverTimestamp,
      lastActivityAt: serverTimestamp,
    });

    transaction.set(eventRef, {
      eventId: eventRef.id,
      applicationId,
      organizationId,
      type: "APPLICATION_CREATED",
      toStage: "NEW" satisfies ApplicationStage,
      changedBy: authUid,
      note: "J&C 인재풀 채용 제안을 후보자가 수락했습니다.",
      metadata: {
        source: "HEADHUNTING",
        opportunityId,
      },
      createdAt: serverTimestamp,
    });

    transaction.update(opportunityRef, {
      status: "CONVERTED" satisfies TalentOpportunityStatus,
      respondedAt: serverTimestamp,
      updatedAt: serverTimestamp,
      applicationId,
    });
  });

  const snapshot = await opportunityRef.get();
  return toView(opportunityId, snapshot.data() || {});
}
