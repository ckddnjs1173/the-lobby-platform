import type { GlobalTalentPoolItem } from "./globalTalentPoolApi";
import type { B2BJobView } from "./jobApi";

export interface TalentMatchSignal {
  key: "JOB" | "LOCATION" | "EMPLOYMENT" | "ACTIVE" | "AVAILABLE";
  label: string;
  matched: boolean;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("ko-KR")
    .replace(/[·/(),\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function looselyMatches(preference: string, target: string): boolean {
  const left = normalize(preference);
  const right = normalize(target);
  if (!left || !right) return false;
  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = tokens(left);
  const rightTokens = new Set(tokens(right));
  return leftTokens.some((token) => rightTokens.has(token) || right.includes(token));
}

export function buildTalentMatchSignals(
  candidate: GlobalTalentPoolItem,
  job: B2BJobView
): TalentMatchSignal[] {
  const jobText = [job.title, job.description, job.company, job.displayCompany].filter(Boolean).join(" ");

  return [
    {
      key: "JOB",
      label: "희망직무 일치",
      matched: looselyMatches(candidate.desiredJob, jobText),
    },
    {
      key: "LOCATION",
      label: "희망지역 일치",
      matched: looselyMatches(candidate.desiredLocation, job.location),
    },
    {
      key: "EMPLOYMENT",
      label: "고용형태 일치",
      matched: looselyMatches(candidate.desiredEmploymentType, job.employmentType),
    },
    {
      key: "ACTIVE",
      label: "적극 구직",
      matched: candidate.jobSearchStatus === "ACTIVE",
    },
    {
      key: "AVAILABLE",
      label: "입사가능 정보 있음",
      matched: Boolean(candidate.availableFrom.trim()),
    },
  ];
}

export function countMatchedSignals(signals: TalentMatchSignal[]): number {
  return signals.filter((signal) => signal.matched).length;
}
