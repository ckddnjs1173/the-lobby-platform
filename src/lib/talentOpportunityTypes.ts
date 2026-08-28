export type TalentOpportunityStatus =
  | "PROPOSED"
  | "DECLINED"
  | "CONVERTED";

export interface TalentOpportunityView {
  opportunityId: string;
  candidateId: string;
  jobId: string;
  organizationId: string;
  recruiterId: string;
  status: TalentOpportunityStatus;
  jobTitle: string;
  displayCompany: string;
  location: string;
  employmentType: string;
  salary: string;
  note: string;
  createdAt: string | null;
  respondedAt: string | null;
}
