const CANDIDATE_RETURN_PATH_KEY =
  "the-lobby:candidate-return-path";

function isSafeCandidateReturnPath(
  value: string | null | undefined
): value is string {
  if (
    !value ||
    value.startsWith("//") ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return false;
  }

  return (
    value.startsWith("/jobs") ||
    value === "/talent-pool/settings" ||
    value === "/candidate/saved-jobs" ||
    value === "/candidate/opportunities"
  );
}

export function rememberCandidateReturnPath(path: string): void {
  if (typeof window === "undefined" || !isSafeCandidateReturnPath(path)) return;
  window.sessionStorage.setItem(CANDIDATE_RETURN_PATH_KEY, path);
}

export function peekCandidateReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(CANDIDATE_RETURN_PATH_KEY);
  return isSafeCandidateReturnPath(value) ? value : null;
}

export function consumeCandidateReturnPath(): string | null {
  const value = peekCandidateReturnPath();
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(CANDIDATE_RETURN_PATH_KEY);
  }
  return value;
}
