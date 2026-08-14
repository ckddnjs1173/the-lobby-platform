import type {
  ApplicationStage,
  CareerItem,
  EducationItem,
} from "../types";

export interface CandidatePortalProfileView {
  candidateId: string;
  name: string;
  phone: string;
  email: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: EducationItem[];
  profileCompleteness: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CandidatePortalInterviewView {
  interviewId: string;
  scheduledAt: string;
  method: "ONSITE" | "VIDEO" | "PHONE";
  location: string | null;
  interviewer: string | null;
}

export interface CandidatePortalApplicationView {
  applicationId: string;
  jobId: string;
  stage: ApplicationStage;
  jobTitle: string;
  company: string;
  appliedAt: string | null;
  updatedAt: string | null;
  lastActivityAt: string | null;
  nextInterview: CandidatePortalInterviewView | null;
  plannedStartDate: string | null;
}

export interface CandidatePortalBootstrapResult {
  created: boolean;
  profile: CandidatePortalProfileView;
}
