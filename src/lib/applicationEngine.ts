import { db } from "./firebase";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { ApplicationStage, ApplicationSource } from "../types";

// 엄격한 디스크리미네이티드 유니온 타입 정의
export type EngineResult<T = unknown> = 
  | { success: true; data?: T; applicationId?: string; error?: never }
  | { success: false; error: string; data?: never; applicationId?: never };

/**
 * 지원서 생성 트랜잭션 엔진 (Backend Core)
 */
export async function createApplicationTransaction(
  candidateId: string,
  jobId: string,
  source: ApplicationSource = "B2C_WEB",
  authUid?: string
): Promise<EngineResult<{ applicationId: string }>> {
  const applicationId = `${candidateId}__${jobId}`;
  const appRef = doc(db, "applications", applicationId);
  const jobRef = doc(db, "jobs", jobId);
  const candRef = doc(db, "candidates", candidateId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const existingAppSnap = await transaction.get(appRef);
      if (existingAppSnap.exists()) {
        throw new Error("이미 해당 공고에 지원하셨습니다.");
      }

      const jobSnap = await transaction.get(jobRef);
      if (!jobSnap.exists()) {
        throw new Error("존재하지 않는 채용 공고입니다.");
      }
      
      const jobData = jobSnap.data();
      if (jobData.status !== "OPEN") {
        throw new Error("마감되었거나 진행 중이 아닌 공고입니다.");
      }
      if (!jobData.organizationId) {
        // 보안/권한 격리를 위한 Tenant ID가 없으면 무조건 실패 (Fallback 금지)
        throw new Error("INVALID_JOB_TENANT: 기업 정보가 누락된 비정상적인 공고입니다.");
      }

      const candSnap = await transaction.get(candRef);
      if (!candSnap.exists()) {
        throw new Error("후보자 정보를 찾을 수 없습니다.");
      }
      
      const candData = candSnap.data();

      const candidateSnapshot = {
        name: candData.name || "이름 없음",
        phone: candData.phone || "-",
        email: candData.email || "-",
      };

      const jobSnapshot = {
        title: jobData.title || "공고명 없음",
        company: jobData.company || "기업명 없음",
      };

      const newApplication = {
        applicationId,
        candidateId,
        jobId,
        organizationId: jobData.organizationId, // 강제 상속
        recruiterId: jobData.recruiterId || null, // 공고 담당자를 초기 담당자로 자동 할당
        stage: "NEW" as ApplicationStage,
        source,
        candidateSnapshot,
        jobSnapshot,
        appliedAt: serverTimestamp(), // 클라이언트 시간 신뢰 금지
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
      };

      transaction.set(appRef, newApplication);

      // Audit Log 원자적 생성
      const eventRef = doc(db, "appEvents", `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
      const newEvent = {
        eventId: eventRef.id,
        applicationId,
        type: "APPLICATION_CREATED" as const,
        toStage: "NEW" as ApplicationStage,
        changedBy: authUid || candidateId,
        note: "공고 원클릭 지원 완료",
        createdAt: serverTimestamp(),
      };
      
      transaction.set(eventRef, newEvent);

      return { success: true as const, applicationId };
    });

    return result;
  } catch (error: any) {
    console.error("Create Application Transaction Error:", error);
    return { success: false, error: error.message || "지원 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 지원 단계 변경 트랜잭션 엔진 (Backend Core)
 */
export async function updateApplicationStageTransaction(
  applicationId: string,
  newStage: ApplicationStage,
  changedByUid: string,
  note?: string
): Promise<EngineResult> {
  const appRef = doc(db, "applications", applicationId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const appSnap = await transaction.get(appRef);
      if (!appSnap.exists()) {
        throw new Error("존재하지 않는 지원 내역입니다.");
      }

      const appData = appSnap.data();
      const oldStage = appData.stage;

      if (oldStage === newStage) {
        return { success: true as const };
      }

      // 1. 상태 업데이트
      transaction.update(appRef, {
        stage: newStage,
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
      });

      // 2. 감사 로그 기록 (실제 변경자 UID 필수로 기록)
      const eventRef = doc(db, "appEvents", `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
      const newEvent = {
        eventId: eventRef.id,
        applicationId,
        type: "STAGE_CHANGED" as const,
        fromStage: oldStage,
        toStage: newStage,
        changedBy: changedByUid,
        note: note || `단계를 ${oldStage}에서 ${newStage}(으)로 변경했습니다.`,
        createdAt: serverTimestamp(),
      };
      
      transaction.set(eventRef, newEvent);

      return { success: true as const };
    });

    return result;
  } catch (error: any) {
    console.error("Update Stage Transaction Error:", error);
    return { success: false, error: error.message || "상태 변경 중 오류가 발생했습니다." };
  }
}