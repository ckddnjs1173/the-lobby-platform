import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import type {
  ApplicationStage,
} from "../../types";

import {
  requireB2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class B2BDirectApplicationServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "B2B_DIRECT_APPLICATION_ERROR"
  ) {
    super(message);
    this.name = "B2BDirectApplicationServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface CreateB2BDirectApplicationResult {
  applicationId: string;
  candidateId: string;
  jobId: string;
  organizationId: string;
  recruiterId: string;
  stage: ApplicationStage;
  source: "B2B_DIRECT";
}

function normalizeId(
  value: string,
  label: string,
  code: string
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new B2BDirectApplicationServiceError(
      `${label}가 필요합니다.`,
      400,
      code
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

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new B2BDirectApplicationServiceError(
      `${key} 정보가 누락되어 있습니다.`,
      409,
      code
    );
  }

  return value.trim();
}

export async function createB2BDirectApplication(
  actorUid: string,
  candidateIdInput: string,
  jobIdInput: string
): Promise<CreateB2BDirectApplicationResult> {
  const actor =
    await requireB2BActor(actorUid);

  const candidateId = normalizeId(
    candidateIdInput,
    "후보자 ID",
    "CANDIDATE_ID_REQUIRED"
  );

  const jobId = normalizeId(
    jobIdInput,
    "공고 ID",
    "JOB_ID_REQUIRED"
  );

  const db = getFirebaseAdminDb();

  const applicationId =
    `${candidateId}__${jobId}`;

  const candidateRef = db
    .collection("candidates")
    .doc(candidateId);

  const jobRef = db
    .collection("jobs")
    .doc(jobId);

  const applicationRef = db
    .collection("applications")
    .doc(applicationId);

  const eventRef = db
    .collection("appEvents")
    .doc();

  return db.runTransaction(
    async (transaction) => {
      const existingApplication =
        await transaction.get(applicationRef);

      const candidateSnapshot =
        await transaction.get(candidateRef);

      const jobSnapshot =
        await transaction.get(jobRef);

      if (existingApplication.exists) {
        throw new B2BDirectApplicationServiceError(
          "이미 해당 공고에 등록된 후보자입니다.",
          409,
          "DUPLICATE_APPLICATION"
        );
      }

      if (!candidateSnapshot.exists) {
        throw new B2BDirectApplicationServiceError(
          "후보자 정보를 찾을 수 없습니다.",
          404,
          "CANDIDATE_NOT_FOUND"
        );
      }

      if (!jobSnapshot.exists) {
        throw new B2BDirectApplicationServiceError(
          "채용 공고를 찾을 수 없습니다.",
          404,
          "JOB_NOT_FOUND"
        );
      }

      const candidateData =
        candidateSnapshot.data();

      const jobData =
        jobSnapshot.data();

      if (!candidateData || !jobData) {
        throw new B2BDirectApplicationServiceError(
          "지원 생성에 필요한 데이터가 없습니다.",
          409,
          "APPLICATION_DATA_MISSING"
        );
      }

      if (
        candidateData.source !== "B2B_DIRECT" ||
        candidateData.authUid !== null
      ) {
        throw new B2BDirectApplicationServiceError(
          "B2B 직접 등록 후보자만 이 기능으로 지원 처리할 수 있습니다.",
          409,
          "CANDIDATE_NOT_B2B_DIRECT"
        );
      }

      if (candidateData.accountStatus !== "ACTIVE") {
        throw new B2BDirectApplicationServiceError(
          "활성 상태의 후보자만 공고에 등록할 수 있습니다.",
          409,
          "CANDIDATE_NOT_ACTIVE"
        );
      }

      if (jobData.status !== "OPEN") {
        throw new B2BDirectApplicationServiceError(
          "공개 중인 공고에만 후보자를 등록할 수 있습니다.",
          409,
          "JOB_NOT_OPEN"
        );
      }

      const organizationId = requireString(
        jobData,
        "organizationId",
        "JOB_ORGANIZATION_MISSING"
      );

      if (
        actor.role === "RECRUITER" &&
        actor.organizationId !== organizationId
      ) {
        throw new B2BDirectApplicationServiceError(
          "다른 조직의 공고에는 후보자를 등록할 수 없습니다.",
          403,
          "TENANT_ACCESS_DENIED"
        );
      }

      const recruiterId = requireString(
        jobData,
        "recruiterId",
        "JOB_RECRUITER_MISSING"
      );

      const candidateName = requireString(
        candidateData,
        "name",
        "CANDIDATE_NAME_MISSING"
      );

      const candidatePhone = requireString(
        candidateData,
        "phone",
        "CANDIDATE_PHONE_MISSING"
      );

      const candidateEmail = requireString(
        candidateData,
        "email",
        "CANDIDATE_EMAIL_MISSING"
      );

      const jobTitle = requireString(
        jobData,
        "title",
        "JOB_TITLE_MISSING"
      );

      const jobCompany = requireString(
        jobData,
        "company",
        "JOB_COMPANY_MISSING"
      );

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.set(
        applicationRef,
        {
          applicationId,
          candidateId,
          jobId,
          organizationId,
          recruiterId,
          stage:
            "NEW" satisfies ApplicationStage,
          source: "B2B_DIRECT",
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
        }
      );

      transaction.set(
        eventRef,
        {
          eventId: eventRef.id,
          applicationId,
          organizationId,
          type: "APPLICATION_CREATED",
          toStage:
            "NEW" satisfies ApplicationStage,
          changedBy: actor.uid,
          note:
            "B2B 직접 등록 후보자를 공고에 등록했습니다.",
          metadata: {
            source: "B2B_DIRECT",
          },
          createdAt: serverTimestamp,
        }
      );

      return {
        applicationId,
        candidateId,
        jobId,
        organizationId,
        recruiterId,
        stage:
          "NEW" as ApplicationStage,
        source: "B2B_DIRECT" as const,
      };
    }
  );
}
