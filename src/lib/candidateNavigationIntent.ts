const CANDIDATE_RETURN_PATH_KEY =
  "the-lobby:candidate-return-path";

function isSafeJobPath(value: string | null | undefined): value is string {
  return Boolean(
    value &&
      value.startsWith("/jobs") &&
      !value.startsWith("//") &&
      !value.includes("\n") &&
      !value.includes("\r")
  );
}

export function rememberCandidateReturnPath(path: string): void {
  if (typeof window === "undefined" || !isSafeJobPath(path)) return;
  window.sessionStorage.setItem(CANDIDATE_RETURN_PATH_KEY, path);
}

export function peekCandidateReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(CANDIDATE_RETURN_PATH_KEY);
  return isSafeJobPath(value) ? value : null;
}

export function consumeCandidateReturnPath(): string | null {
  const value = peekCandidateReturnPath();
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(CANDIDATE_RETURN_PATH_KEY);
  }
  return value;
}
