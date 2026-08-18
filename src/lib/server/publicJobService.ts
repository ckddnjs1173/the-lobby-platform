import type { DocumentData } from "firebase-admin/firestore";

import type { PublicJobView } from "../publicJobTypes";
import { getFirebaseAdminDb } from "./firebaseAdmin";

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
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

function toPublicJob(jobId: string, data: DocumentData): PublicJobView {
  return {
    jobId,
    displayCompany:
      stringValue(data.displayCompany) || "The Lobby Partner",
    title: stringValue(data.title),
    description: stringValue(data.description),
    requirements: stringArray(data.requirements),
    preferredQualifications: stringArray(data.preferredQualifications),
    salary: stringValue(data.salary),
    location: stringValue(data.location),
    employmentType: stringValue(data.employmentType),
    status: "OPEN",
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function listPublicJobs(): Promise<PublicJobView[]> {
  const snapshot = await getFirebaseAdminDb()
    .collection("jobs")
    .where("status", "==", "OPEN")
    .get();

  return snapshot.docs
    .map((document) => toPublicJob(document.id, document.data()))
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
}

export async function getPublicJob(jobIdInput: string): Promise<PublicJobView | null> {
  const jobId = jobIdInput.trim();
  if (!jobId) return null;

  const snapshot = await getFirebaseAdminDb()
    .collection("jobs")
    .doc(jobId)
    .get();

  if (!snapshot.exists) return null;

  const data = snapshot.data();
  if (!data || data.status !== "OPEN") return null;

  return toPublicJob(snapshot.id, data);
}
