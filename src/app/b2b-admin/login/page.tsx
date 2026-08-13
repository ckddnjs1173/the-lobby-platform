"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  auth,
} from "../../../lib/firebase";

import {
  B2BApiError,
  fetchB2BSession,
} from "../../../lib/b2bApi";

// ============================================================================
// Error Message
// ============================================================================

function getErrorMessage(
  errorCode: string | null
): string {
  switch (errorCode) {
    case "B2B_USER_NOT_FOUND":
      return "관리자로 등록되지 않은 계정입니다.";

    case "B2B_ROLE_REQUIRED":
      return "헤드헌터 워크스페이스 접근 권한이 없는 계정입니다.";

    case "B2B_USER_INACTIVE":
      return "현재 사용할 수 없는 관리자 계정입니다.";

    case "RECRUITER_ORGANIZATION_MISSING":
      return "관리자 조직 정보가 설정되지 않았습니다.";

    case "INVALID_ID_TOKEN":
      return "로그인 세션이 만료되었습니다. 다시 로그인해주세요.";

    case "AUTH_REQUIRED":
      return "관리자 로그인이 필요합니다.";

    case "B2B_SESSION_FAILED":
      return "관리자 권한을 확인할 수 없습니다.";

    case "NETWORK_ERROR":
      return "서버에 연결할 수 없습니다.";

    default:
      return "";
  }
}

// ============================================================================
// Login Content
// ============================================================================

/**
 * useSearchParams()는 production static rendering 시
 * Suspense Boundary 내부에서 사용해야 한다.
 *
 * 따라서 실제 Login UI를 별도 내부 컴포넌트로 분리하고,
 * default export에서 Suspense로 감싼다.
 */
function AdminLoginContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  // ==========================================================================
  // Query Error
  // ==========================================================================

  useEffect(() => {
    const errorCode =
      searchParams.get(
        "error"
      );

    const message =
      getErrorMessage(
        errorCode
      );

    if (message) {
      setError(message);
    }
  }, [searchParams]);

  // ==========================================================================
  // Login
  // ==========================================================================

  const handleLogin =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      const normalizedEmail =
        email.trim();

      if (
        !normalizedEmail ||
        !password
      ) {
        setError(
          "이메일과 비밀번호를 입력해주세요."
        );

        return;
      }

      setLoading(true);
      setError("");

      try {
        /**
         * Step 1.
         * Firebase Authentication
         */
        await signInWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );

        /**
         * Step 2.
         * The Lobby Server Authorization
         *
         * Firebase 로그인 성공만으로
         * B2B 관리자 권한을 인정하지 않는다.
         *
         * Server API에서:
         *
         * - Firebase ID Token
         * - users/{uid}
         * - ADMIN / RECRUITER Role
         * - Account Status
         * - organizationId
         *
         * 를 다시 검증한다.
         */
        await fetchB2BSession();

        /**
         * Authentication + Authorization
         * 모두 성공한 경우에만 Workspace 진입.
         */
        router.replace(
          "/b2b-admin"
        );
      } catch (caughtError) {
        console.error(
          "B2B login failed:",
          caughtError
        );

        /**
         * Firebase 인증 자체는 성공했지만
         * B2B Role/Tenant 권한 검증에서 실패할 수도 있다.
         *
         * 권한 없는 Firebase 계정이 관리자 로그인 상태로
         * 브라우저에 남는 것을 방지하기 위해 로그아웃한다.
         */
        try {
          await signOut(auth);
        } catch (
          signOutError
        ) {
          console.error(
            "Failed to sign out after B2B login failure:",
            signOutError
          );
        }

        if (
          caughtError instanceof
          B2BApiError
        ) {
          setError(
            caughtError.message
          );

          return;
        }

        /**
         * Firebase Auth Error와
         * 예상하지 못한 로그인 오류는
         * 외부에 세부 정보를 노출하지 않는다.
         */
        setError(
          "이메일 또는 비밀번호가 일치하지 않거나 관리자 권한이 없습니다."
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-navy">
            The Lobby Admin
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            J&C 헤드헌터 전용 업무
            시스템입니다.
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={
            handleLogin
          }
          className="space-y-5"
        >
          {/* Email */}
          <div>
            <label
              htmlFor="admin-email"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              이메일
            </label>

            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target.value
                )
              }
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="admin@jnc.com"
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="admin-password"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              비밀번호
            </label>

            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(
                event
              ) =>
                setPassword(
                  event.target.value
                )
              }
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg"
            >
              <p className="text-red-600 text-xs text-center font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-navy text-brand-gold py-3.5 rounded-xl font-bold hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? "권한 확인 중..."
              : "시스템 접속"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Suspense Fallback
// ============================================================================

function AdminLoginFallback() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="text-center space-y-2">
        <div className="text-sm font-semibold text-slate-600">
          로그인 화면을 준비하고
          있습니다...
        </div>

        <div className="text-xs text-slate-400">
          The Lobby Admin
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <AdminLoginFallback />
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}