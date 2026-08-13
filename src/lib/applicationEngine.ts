import { db } from "./firebase";
import { 
  doc, 
  runTransaction, 
  serverTimestamp, 
  collection, 
  getDoc, 
  getDocs, 
  query, 
  where 
} from "firebase/firestore";
import { ApplicationStage, EventType } from "../types";

/**
 * 1. 원클릭 지원 생성 엔진 (DB 레벨 중복 지원 방지 및 트랜잭션 적용)
 * - 결정론적 ID(candidateId_jobId)를 사용하여 동일 공고 중복 지원을 원천 차단합니다.
 * - Application 생성과 동시에 APPLICATION_CREATED 이벤트를 원자적으로 기록합니다.
 */
export async function createApplicationTransaction(
  candidateId: string,
  jobId: string,
  source: string = "DIRECT"
): Promise<{ success: boolean; applicationId?: string; error?: string }> {
  // Deterministic ID 생성 (candidateId + jobId)
  const applicationId = `${candidateId}__${jobId}`;
  const appRef = doc(db, "applications", applicationId);
  const eventRef = doc(collection(db, "appEvents")); // 자동 ID 이벤트 문서

  try {
    await runTransaction(db, async (transaction) => {
      // 중복 지원 여부 재확인 (문서 존재 여부 체크)
      const appDoc = await transaction.get(appRef);
      if (appDoc.exists()) {
        throw new Error("ALREADY_APPLIED");
      }

      // Job 및 Candidate 존재 여부 확인 (데이터 정합성)
      const jobRef = doc(db, "jobs", jobId);
      const candidateRef = doc(db, "candidates", candidateId);
      
      const [jobSnap, candidateSnap] = await Promise.all([
        transaction.get(jobRef),
        transaction.get(candidateRef)
      ]);

      if (!jobSnap.exists()) {
        throw new Error("JOB_NOT_FOUND");
      }

      const jobData = jobSnap.data();
      const recruiterId = jobData?.recruiterId || "SYSTEM";

      const now = new Date().toISOString();

      // Application 데이터 생성
      const newApplicationData = {
        applicationId,
        candidateId,
        jobId,
        recruiterId,
        stage: "NEW" as ApplicationStage,
        source,
        appliedAt: now,
        updatedAt: now,
        lastActivityAt: now,
      };

      // App Event 데이터 생성 (APPLICATION_CREATED)
      const newEventData = {
        eventId: eventRef.id,
        applicationId,
        type: "APPLICATION_CREATED" as EventType,
        fromStage: null,
        toStage: "NEW" as ApplicationStage,
        changedBy: candidateId,
        note: "구직자 원클릭 지원 완료",
        metadata: { source },
        createdAt: now,
      };

      // 트랜잭션 쓰기 수행
      transaction.set(appRef, newApplicationData);
      transaction.set(eventRef, newEventData);
    });

    return { success: true, applicationId };
  } catch (error: any) {
    if (error.message === "ALREADY_APPLIED") {
      return { success: false, error: "이미 지원한 공고입니다." };
    }
    if (error.message === "JOB_NOT_FOUND") {
      return { success: false, error: "존재하지 않는 채용 공고입니다." };
    }
    console.error("Error creating application transaction:", error);
    return { success: false, error: "지원 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 2. 지원 단계(Stage) 변경 및 이벤트 기록 엔진 (Atomic Transaction)
 * - Stage 변경과 STAGE_CHANGED 이벤트 로그 기록을 하나의 트랜잭션으로 묶어 데이터 불일치를 방지합니다.
 */
export async function updateApplicationStageTransaction(
  applicationId: string,
  toStage: ApplicationStage,
  changedBy: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const appRef = doc(db, "applications", applicationId);
  const eventRef = doc(collection(db, "appEvents"));

  try {
    await runTransaction(db, async (transaction) => {
      const appDoc = await transaction.get(appRef);
      if (!appDoc.exists()) {
        throw new Error("APPLICATION_NOT_FOUND");
      }

      const appData = appDoc.data();
      const fromStage = appData.stage as ApplicationStage;

      if (fromStage === toStage) {
        return; // 단계가 동일하면 변경 없음
      }

      const now = new Date().toISOString();

      // Application 업데이트 데이터
      const updateData = {
        stage: toStage,
        updatedAt: now,
        lastActivityAt: now,
      };

      // App Event 데이터 생성 (STAGE_CHANGED)
      const eventData = {
        eventId: eventRef.id,
        applicationId,
        type: "STAGE_CHANGED" as EventType,
        fromStage,
        toStage,
        changedBy,
        note: note || `단계를 [${fromStage}]에서 [${toStage}]로 변경했습니다.`,
        metadata: {},
        createdAt: now,
      };

      // 트랜잭션 실행
      transaction.update(appRef, updateData);
      transaction.set(eventRef, eventData);
    });

    return { success: true };
  } catch (error: any) {
    if (error.message === "APPLICATION_NOT_FOUND") {
      return { success: false, error: "지원 정보를 찾을 수 없습니다." };
    }
    console.error("Error updating stage transaction:", error);
    return { success: false, error: "상태 변경 중 오류가 발생했습니다." };
  }
}