import { FieldValue } from "firebase-admin/firestore";

import {
  CandidatePortalServiceError,
  getCandidatePortalProfile,
} from "./candidatePortalService";
import { getFirebaseAdminDb } from "./firebaseAdmin";
import { getPublicJob } from "./publicJobService";

export class CandidateSavedJobServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "CANDIDATE_SAVED_JOB_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "CandidateSavedJobServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface CandidateSavedJobView {
  jobId: string;
  savedAt: string | null;
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

function normalizeJobId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new CandidateSavedJobServiceError(
      "공고 ID가 필요합니다.",
      400,
      "JOB_ID_REQUIRED"
    );
  }
  return value.trim();
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

export async function listCandidateSavedJobs(
  authUid: string
): Promise<CandidateSavedJobView[]> {
  const candidateId = await resolveCandidateId(authUid);
  const snapshot = await getFirebaseAdminDb()
    .collection("candidateSavedJobs")
    .doc(candidateId)
    .collection("jobs")
    .orderBy("savedAt", "desc")
    .get();

  return snapshot.docs.map((document) => ({
    jobId: document.id,
    savedAt: timestampToIso(document.data().savedAt),
  }));
}

export async function saveCandidateJob(
  authUid: string,
  jobIdInput: unknown
): Promise<CandidateSavedJobView> {
  const candidateId = await resolveCandidateId(authUid);
  const jobId = normalizeJobId(jobIdInput);
  const job = await getPublicJob(jobId);

  if (!job) {
    throw new CandidateSavedJobServiceError(
      "현재 저장할 수 없는 채용공고입니다.",
      404,
      "PUBLIC_JOB_NOT_FOUND"
    );
  }

  const ref = getFirebaseAdminDb()
    .collection("candidateSavedJobs")
    .doc(candidateId)
    .collection("jobs")
    .doc(jobId);

  await ref.set(
    {
      candidateId,
      jobId,
      savedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const snapshot = await ref.get();
  return {
    jobId,
    savedAt: timestampToIso(snapshot.data()?.savedAt),
  };
}

export async function removeCandidateSavedJob(
  authUid: string,
  jobIdInput: unknown
): Promise<{ jobId: string; removed: true }> {
  const candidateId = await resolveCandidateId(authUid);
  const jobId = normalizeJobId(jobIdInput);

  await getFirebaseAdminDb()
    .collection("candidateSavedJobs")
    .doc(candidateId)
    .collection("jobs")
    .doc(jobId)
    .delete();

  return { jobId, removed: true };
}
