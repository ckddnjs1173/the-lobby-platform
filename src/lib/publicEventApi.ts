"use client";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "talent_pool_settings_saved",
  "saved_job_added",
  "saved_job_removed",
]);

export async function trackPublicEvent(eventName: string): Promise<void> {
  if (!ALLOWED_EVENTS.has(eventName)) return;
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/public/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        path: window.location.pathname,
      }),
      keepalive: true,
    });
  } catch {
    // Analytics must never block the user flow.
  }
}
