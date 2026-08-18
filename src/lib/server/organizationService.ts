import type { DocumentData } from "firebase-admin/firestore";

import { requireB2BActor } from "./b2bAuthorization";
import { getFirebaseAdminDb } from "./firebaseAdmin";

export interface B2BOrganizationView {
  organizationId: string;
  name: string;
  status: string;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toOrganizationView(
  organizationId: string,
  data: DocumentData | undefined
): B2BOrganizationView {
  return {
    organizationId,
    name:
      nonEmptyString(data?.name) ||
      nonEmptyString(data?.displayName) ||
      nonEmptyString(data?.companyName) ||
      organizationId,
    status: nonEmptyString(data?.status) || "ACTIVE",
  };
}

export async function listB2BOrganizations(actorUid: string): Promise<B2BOrganizationView[]> {
  const actor = await requireB2BActor(actorUid);
  const db = getFirebaseAdminDb();

  if (actor.role === "RECRUITER") {
    if (!actor.organizationId) return [];
    const snapshot = await db.collection("organizations").doc(actor.organizationId).get();
    return [toOrganizationView(actor.organizationId, snapshot.data())];
  }

  const snapshot = await db.collection("organizations").get();

  return snapshot.docs
    .map((document) => toOrganizationView(document.id, document.data()))
    .sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
}
