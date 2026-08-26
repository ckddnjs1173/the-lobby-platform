import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "./firebaseAdmin";

export const PUBLIC_EVENT_NAMES = new Set([
  "page_view",
  "profile_created",
  "talent_pool_settings_saved",
  "talent_pool_opted_in",
  "talent_pool_opted_out",
  "saved_job_added",
  "saved_job_removed",
  "opportunity_created",
  "opportunity_accepted",
  "opportunity_declined",
  "application_submitted",
]);

export async function recordPublicEvent(
  eventName: string,
  path: string
): Promise<void> {
  if (process.env.PUBLIC_ANALYTICS_DISABLED === "true") return;
  if (!PUBLIC_EVENT_NAMES.has(eventName)) return;

  const normalizedPath =
    path.startsWith("/") && path.length <= 300
      ? path.split("?")[0].split("#")[0] || "/"
      : "/";

  await getFirebaseAdminDb().collection("publicEvents").add({
    eventName,
    path: normalizedPath,
    createdAt: FieldValue.serverTimestamp(),
  });
}
