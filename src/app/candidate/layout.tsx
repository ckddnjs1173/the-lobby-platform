import CandidateNextActionPanel from "../../components/candidate/CandidateNextActionPanel";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CandidateNextActionPanel />
    </>
  );
}
