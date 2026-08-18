import { FieldValue } from "firebase-admin/firestore";

import type { ApplicationStage } from "../../types";
import { getFirebaseAdminDb } from "./firebaseAdmin";

export class CandidateApplicationActionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "CANDIDATE_APPLICATION_ACTION_ERROR") {
    super(message);
    this.name = "CandidateApplicationActionError";
    this.status = status;
    this.code = code;
  }
}

const CANDIDATE_CANCEL_BLOCKED_STAGES = new Set<ApplicationStage>([
  "HIRED",
  "REJECTED",
]);

export async function cancelCandidateApplication(
  authUidInput: string,
  applicationIdInput: string
): Promise<{
  applicationId: string;
  stage: "CANCELED";
  changed: boolean;
}> {
  const authUid = authUidInput.trim();
  const applicationId = applicationIdInput.trim();

  if (!authUid) {
    throw new CandidateApplicationActionError(
      "로그인 사용자 정보를 확인할 수 없습니다.",
      401,
      "AUTH_UID_MISSING"
    );
  }

  if (!applicationId) {
    throw new CandidateApplicationActionError(
      "지원 ID가 필요합니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  const db = getFirebaseAdminDb();
  const applicationRef = db.collection("applications").doc(applicationId);
  const eventRef = db.collection("appEvents").doc();

  return db.runTransaction(async (transaction) => {
    const applicationSnapshot = await transaction.get(applicationRef);

    if (!applicationSnapshot.exists) {
      throw new CandidateApplicationActionError(
        "지원 내역을 찾을 수 없습니다.",
        404,
        "APPLICATION_NOT_FOUND"
      );
    }

    const applicationData = applicationSnapshot.data();
    const candidateId =
      typeof applicationData?.candidateId === "string"
        ? applicationData.candidateId.trim()
        : "";
    const organizationId =
      typeof applicationData?.organizationId === "string"
        ? applicationData.organizationId.trim()
        : "";
    const currentStage = applicationData?.stage as ApplicationStage | undefined;

    if (!candidateId || !organizationId || !currentStage) {
      throw new CandidateApplicationActionError(
        "지원 내역의 필수 정보가 누락되어 있습니다.",
        409,
        "APPLICATION_DATA_MISSING"
      );
    }

    const candidateRef = db.collection("candidates").doc(candidateId);
    const candidateSnapshot = await transaction.get(candidateRef);
    const candidateData = candidateSnapshot.data();

    if (!candidateSnapshot.exists || !candidateData) {
      throw new CandidateApplicationActionError(
        "Candidate 프로필을 찾을 수 없습니다.",
        404,
        "CANDIDATE_NOT_FOUND"
      );
    }

    if (candidateData.authUid !== authUid) {
      throw new CandidateApplicationActionError(
        "본인의 지원 내역만 취소할 수 있습니다.",
        403,
        "APPLICATION_OWNERSHIP_MISMATCH"
      );
    }

    if (currentStage === "CANCELED") {
      return {
        applicationId,
        stage: "CANCELED" as const,
        changed: false,
      };
    }

    if (CANDIDATE_CANCEL_BLOCKED_STAGES.has(currentStage)) {
      throw new CandidateApplicationActionError(
        "최종 결과가 확정된 지원 건은 Candidate Portal에서 취소할 수 없습니다.",
        409,
        "APPLICATION_CANCEL_NOT_ALLOWED"
      );
    }

    const serverTimestamp = FieldValue.serverTimestamp();

    transaction.update(applicationRef, {
      stage: "CANCELED" satisfies ApplicationStage,
      updatedAt: serverTimestamp,
      lastActivityAt: serverTimestamp,
    });

    transaction.set(eventRef, {
      eventId: eventRef.id,
      applicationId,
      organizationId,
      type: "STAGE_CHANGED",
      fromStage: currentStage,
      toStage: "CANCELED" satisfies ApplicationStage,
      changedBy: authUid,
      note: "Candidate Portal에서 지원을 취소했습니다.",
      metadata: {
        actorType: "CANDIDATE",
        action: "SELF_WITHDRAWAL",
      },
      createdAt: serverTimestamp,
    });

    return {
      applicationId,
      stage: "CANCELED" as const,
      changed: true,
    };
  });
}
