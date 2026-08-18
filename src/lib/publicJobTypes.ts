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
  status: "OPEN";
  createdAt: string | null;
  updatedAt: string | null;
}
