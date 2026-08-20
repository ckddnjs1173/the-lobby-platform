import type { DocumentData } from "firebase-admin/firestore";

import { requireB2BActor } from "./b2bAuthorization";
import { getFirebaseAdminDb } from "./firebaseAdmin";

export class AcquisitionAnalyticsServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "ACQUISITION_ANALYTICS_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "AcquisitionAnalyticsServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface AcquisitionEventCount {
  eventName: string;
  count: number;
}

export interface AcquisitionPathCount {
  path: string;
  count: number;
}

export interface AcquisitionFunnel {
  homeViews: number;
  talentPoolViews: number;
  registerViews: number;
  profileCreated: number;
  talentPoolSettingsSaved: number;
  savedJobsAdded: number;
  applicationsSubmitted: number;
}

export interface AcquisitionAnalyticsView {
  sampleSize: number;
  eventCounts: AcquisitionEventCount[];
  topPaths: AcquisitionPathCount[];
  funnel: AcquisitionFunnel;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function countBy(
  documents: DocumentData[],
  getKey: (data: DocumentData) => string
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const data of documents) {
    const key = getKey(data);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function mapToSorted<T extends "eventName" | "path">(
  counts: Map<string, number>,
  key: T,
  limit: number
): Array<Record<T, string> & { count: number }> {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ [key]: value, count })) as Array<
      Record<T, string> & { count: number }
    >;
}

export async function getAcquisitionAnalytics(
  actorUid: string
): Promise<AcquisitionAnalyticsView> {
  const actor = await requireB2BActor(actorUid);
  if (actor.role !== "ADMIN") {
    throw new AcquisitionAnalyticsServiceError(
      "공개 유입 분석은 ADMIN 계정만 조회할 수 있습니다.",
      403,
      "ACQUISITION_ANALYTICS_ADMIN_REQUIRED"
    );
  }

  const snapshot = await getFirebaseAdminDb()
    .collection("publicEvents")
    .orderBy("createdAt", "desc")
    .limit(2000)
    .get();
  const documents = snapshot.docs.map((document) => document.data());
  const eventCounts = countBy(documents, (data) => stringValue(data.eventName));
  const pathCounts = countBy(documents, (data) => stringValue(data.path));

  const pathCount = (path: string) => pathCounts.get(path) || 0;
  const eventCount = (eventName: string) => eventCounts.get(eventName) || 0;

  return {
    sampleSize: documents.length,
    eventCounts: mapToSorted(eventCounts, "eventName", 20) as AcquisitionEventCount[],
    topPaths: mapToSorted(pathCounts, "path", 15) as AcquisitionPathCount[],
    funnel: {
      homeViews: pathCount("/"),
      talentPoolViews: pathCount("/talent-pool"),
      registerViews: pathCount("/register"),
      profileCreated: eventCount("profile_created"),
      talentPoolSettingsSaved: eventCount("talent_pool_settings_saved"),
      savedJobsAdded: eventCount("saved_job_added"),
      applicationsSubmitted: eventCount("application_submitted"),
    },
  };
}
