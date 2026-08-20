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

function optionalString(value: unknown): string | undefined {
  const normalized = stringValue(value);
  return normalized || undefined;
}

function todayInSeoul(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function isPubliclyActiveJob(data: DocumentData): boolean {
  if (data.status !== "OPEN") return false;
  if (data.isTestData === true) return false;
  const deadline = stringValue(data.applicationDeadline);
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return true;
  return deadline >= todayInSeoul();
}

function toPublicJob(jobId: string, data: DocumentData): PublicJobView {
  const benefits = stringArray(data.benefits);

  return {
    jobId,
    displayCompany: stringValue(data.displayCompany) || "The Lobby Partner",
    workplaceName: optionalString(data.workplaceName),
    employingCompany: optionalString(data.employingCompany),
    title: stringValue(data.title),
    description: stringValue(data.description),
    requirements: stringArray(data.requirements),
    preferredQualifications: stringArray(data.preferredQualifications),
    salary: stringValue(data.salary),
    salaryBase: optionalString(data.salaryBase),
    salaryIncentive: optionalString(data.salaryIncentive),
    salaryAllowances: optionalString(data.salaryAllowances),
    severancePay: optionalString(data.severancePay),
    location: stringValue(data.location),
    employmentType: stringValue(data.employmentType),
    workSchedule: optionalString(data.workSchedule),
    workHours: optionalString(data.workHours),
    breakTime: optionalString(data.breakTime),
    contractPeriod: optionalString(data.contractPeriod),
    conversionOpportunity: optionalString(data.conversionOpportunity),
    experienceLevel: optionalString(data.experienceLevel),
    educationLevel: optionalString(data.educationLevel),
    headcount: optionalString(data.headcount),
    benefits: benefits.length ? benefits : undefined,
    nearbyTransit: optionalString(data.nearbyTransit),
    detailedLocation: optionalString(data.detailedLocation),
    applicationDeadline: optionalString(data.applicationDeadline),
    interviewSchedule: optionalString(data.interviewSchedule),
    expectedStartDate: optionalString(data.expectedStartDate),
    hiringScheduleNote: optionalString(data.hiringScheduleNote),
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
    .filter((document) => isPubliclyActiveJob(document.data()))
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
  if (!data || !isPubliclyActiveJob(data)) return null;

  return toPublicJob(snapshot.id, data);
}
