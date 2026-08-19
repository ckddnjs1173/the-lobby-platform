export interface PublicJobView {
  jobId: string;
  displayCompany: string;
  title: string;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  salary: string;
  location: string;
  employmentType: string;
  workSchedule?: string;
  workHours?: string;
  breakTime?: string;
  contractPeriod?: string;
  conversionOpportunity?: string;
  experienceLevel?: string;
  educationLevel?: string;
  headcount?: string;
  benefits?: string[];
  nearbyTransit?: string;
  detailedLocation?: string;
  applicationDeadline?: string;
  status: "OPEN";
  createdAt: string | null;
  updatedAt: string | null;
}
