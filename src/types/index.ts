// --- 1. Candidate (구직자 본체) ---
export interface Candidate {
  candidateId: string; // Firebase Auth UID
  name: string;
  phone: string;
  email: string;
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
}

// --- 2. Profile (커리어 정보 - 1:1 관계) ---
export interface CareerItem {
  companyName: string;
  role: string;
  period: string;
  description: string;
}

export interface Profile {
  candidateId: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: string[];
  profileCompleteness: number; // 완성도 퍼센트 (예: 78)
  updatedAt: string;
}

// --- 3. Job (채용 공고) ---
export interface Job {
  jobId: string;
  organizationId: string; // 멀티테넌트 / 기업 확장 대비
  company: string;
  displayCompany: string;
  title: string;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  salary: string;
  location: string;
  employmentType: string;
  status: "OPEN" | "CLOSED" | "DRAFT";
  recruiterId: string;
  createdAt: string;
  updatedAt: string;
}

// --- 4. Application (지원 내역 - 1:N 관계) ---
export type ApplicationStage =
  | "NEW"              // 신규
  | "REVIEWING"        // 검토
  | "CONTACTED"        // 연락
  | "RECOMMEND_PENDING"// 추천 예정
  | "RECOMMENDED"      // 고객사 추천
  | "DOCUMENT_SCREEN"  // 서류전형
  | "INTERVIEW"        // 면접
  | "OFFER"            // 처우협의
  | "HIRED"            // 합격 / 입사
  | "HOLD"             // 보류 (Terminal)
  | "REJECTED"         // 탈락 (Terminal)
  | "CANCELED";        // 지원취소 (Terminal)

export interface Application {
  applicationId: string;
  candidateId: string;
  jobId: string;
  recruiterId?: string;
  stage: ApplicationStage;
  source: string;
  appliedAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

// --- 5. App Event (활동 및 상태 변경 로그) ---
export type EventType =
  | "APPLICATION_CREATED"
  | "STAGE_CHANGED"
  | "NOTE_ADDED"
  | "RECRUITER_ASSIGNED"
  | "EMAIL_SENT"
  | "INTERVIEW_SCHEDULED"
  | "PROFILE_UPDATED";

export interface AppEvent {
  eventId: string;
  applicationId: string;
  type: EventType;
  fromStage?: ApplicationStage;
  toStage?: ApplicationStage;
  changedBy: string; // Admin/Recruiter UID 또는 System
  note?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}