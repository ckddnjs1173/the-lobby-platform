"use client";

import type {
  ReactNode,
} from "react";

import {
  useParams,
} from "next/navigation";

import CandidatePlacementPanel from "../../../../components/b2b-admin/CandidatePlacementPanel";

export default function CandidateCrmDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  const params = useParams<{
    candidateId: string;
  }>();

  const candidateId =
    typeof params.candidateId === "string"
      ? params.candidateId
      : "";

  return (
    <div className="space-y-6">
      {children}
      {candidateId ? (
        <CandidatePlacementPanel
          candidateId={candidateId}
        />
      ) : null}
    </div>
  );
}