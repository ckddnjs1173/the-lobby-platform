export type JobSearchStatus =
  | "ACTIVE"
  | "OPEN"
  | "NOT_LOOKING";

export interface CandidatePreferencesView {
  desiredJob: string;
  desiredLocation: string;
  desiredSalary: string;
  desiredEmploymentType: string;
  jobSearchStatus: JobSearchStatus;
  availableFrom: string;
  talentPoolOptIn: boolean;
  jobAlertOptIn: boolean;
  consentVersion: string | null;
  updatedAt: string | null;
}

export interface CandidatePreferencesInput {
  desiredJob: string;
  desiredLocation: string;
  desiredSalary: string;
  desiredEmploymentType: string;
  jobSearchStatus: JobSearchStatus;
  availableFrom: string;
  talentPoolOptIn: boolean;
  jobAlertOptIn: boolean;
  privacyConsent: boolean;
  termsConsent: boolean;
}
